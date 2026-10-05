/**
 * Udhwa seed.
 *
 *   npm run db:seed              → core content (migrated from the legacy udhwa.in site)
 *   npm run db:seed -- --minimal → structure only (localities, categories, bylines), no content
 *   npm run db:seed -- --reset   → wipe content tables first (users are kept).
 *                                  Local databases only — refused in production
 *                                  and against remote hosts such as Neon.
 * (run inside udhwa-api; reads udhwa-api/.env)
 *
 * Seeding production is safe: without --reset it only runs on an empty
 * database and never deletes anything.
 *
 * Core content is real: the articles, businesses, photos and places all
 * come from the original udhwa.in project. Sample listings (services,
 * demo contributions) are added only to local development databases, or
 * with SEED_SAMPLES=true, and carry no phone numbers so they can never be
 * mistaken for verified information.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateJSON } from "@tiptap/html/server";
import { PrismaClient, type CategoryKind, type Prisma } from "../src/generated/prisma/client";
import { richTextExtensions } from "../src/lib/rich-text/extensions";
import { sanitizeDoc, readingMinutes } from "../src/lib/rich-text/schema";
import { assertLocalDatabase, isLocalDatabase } from "../scripts/local-db-guard";
import { reindexMediaUsage } from "../src/services/media-reindex";
import { db as appDb } from "../src/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const RESET = process.argv.includes("--reset");
// --minimal (or SEED_CONTENT=false): structure only — localities, categories,
// bylines and legacy section redirects. No places, businesses, news, blogs or photos.
const MINIMAL = process.argv.includes("--minimal") || process.env.SEED_CONTENT === "false";
// Sample listings and demo accounts: local development databases only, unless asked for explicitly.
const SAMPLES = process.env.SEED_SAMPLES ? process.env.SEED_SAMPLES === "true" : process.env.NODE_ENV !== "production" && isLocalDatabase();

const extensions = richTextExtensions();
const html = (s: string) => sanitizeDoc(generateJSON(s, extensions)) as unknown as Prisma.InputJsonValue;
const file = (name: string) => html(fs.readFileSync(path.join(__dirname, "seed-content", name), "utf8"));
const d = (s: string) => new Date(`${s}T09:00:00+05:30`);

async function reset() {
  console.log("Resetting content tables…");
  await db.$transaction([
    db.mediaUsage.deleteMany(),
    db.auditLog.deleteMany(),
    db.redirect.deleteMany(),
    db.correction.deleteMany(),
    db.contribution.deleteMany(),
    db.contactMessage.deleteMany(),
    db.photo.deleteMany(),
    db.blogPost.deleteMany(),
    db.newsArticle.deleteMany(),
    db.service.deleteMany(),
    db.business.deleteMany(),
    db.place.deleteMany(),
    db.media.deleteMany(),
    db.tag.deleteMany(),
    db.category.deleteMany(),
    db.author.deleteMany(),
    db.locality.deleteMany(),
  ]);
}

async function main() {
  if (RESET) {
    assertLocalDatabase("db:seed --reset");
    await reset();
  }
  if ((await db.place.count()) > 0 || (MINIMAL && (await db.locality.count()) > 0)) {
    console.log("Content already present — skipping. Use `npm run db:seed -- --reset` to start over.");
    return;
  }

  // ── Team ────────────────────────────────────────────────
  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim().toLowerCase();
  const founder = adminEmail
    ? await db.user.upsert({
        where: { email: adminEmail },
        update: { role: "ADMIN" },
        create: { email: adminEmail, name: "Sarfaraj Alam", role: "ADMIN", username: "sarfaraj", bio: "Founder of Udhwa. Self-taught web developer from Udhwa." },
      })
    : null;

  const authorSarfaraj = await db.author.create({
    data: {
      slug: "sarfaraj-alam",
      name: "Sarfaraj Alam",
      bio: "Founder of Udhwa and a self-taught web developer from Udhwa, Sahibganj. Writes about technology, learning and the Udhwa region.",
      avatarUrl: "/seed/sarfaraj-alam.jpg",
      userId: founder?.id,
    },
  });
  const authorDesk = await db.author.create({
    data: { slug: "udhwa-desk", name: "Udhwa Desk", bio: "Local updates compiled and verified by the Udhwa team from official notices and on-ground reporting." },
  });

  // ── Geography ───────────────────────────────────────────
  const india = await db.locality.create({ data: { slug: "india", name: "India", kind: "COUNTRY" } });
  const jharkhand = await db.locality.create({ data: { slug: "jharkhand", name: "Jharkhand", kind: "STATE", parentId: india.id } });
  const sahibganj = await db.locality.create({ data: { slug: "sahibganj", name: "Sahibganj", kind: "DISTRICT", parentId: jharkhand.id, description: "District in north-eastern Jharkhand on the banks of the Ganga." } });
  const udhwa = await db.locality.create({
    data: {
      slug: "udhwa",
      name: "Udhwa",
      kind: "VILLAGE",
      parentId: sahibganj.id,
      isPrimary: true,
      description: "Udhwa is a village and community development block in the Rajmahal subdivision of Sahibganj district, Jharkhand (PIN 816108), best known for the Udhwa Lake Bird Sanctuary.",
    },
  });

  // ── Taxonomy ────────────────────────────────────────────
  const catDefs: Record<CategoryKind, [string, string][]> = {
    PLACE: [["nature", "Nature & Wildlife"], ["education", "Schools & Education"], ["transport", "Transport"], ["landmark", "Landmarks"], ["water", "Lakes & Rivers"]],
    BUSINESS: [["restaurant", "Restaurants & Food"], ["shop", "Shops & Stores"], ["fuel", "Fuel Stations"]],
    SERVICE: [["home-repair", "Home Repair"], ["education", "Tutoring"], ["transport", "Transport"], ["electronics", "Electronics Repair"], ["events", "Events & Photography"]],
    NEWS: [["local", "Local News"], ["education", "Education"], ["announcements", "Announcements"]],
    BLOG: [["nature", "Nature & Travel"], ["technology", "Technology"], ["guides", "Guides"]],
    PHOTO: [["landscape", "Landscapes"], ["wildlife", "Wildlife"], ["community", "Community"]],
  };
  const cat: Record<string, string> = {};
  for (const [kind, list] of Object.entries(catDefs) as [CategoryKind, [string, string][]][]) {
    for (const [i, [slug, name]] of list.entries()) {
      const c = await db.category.create({ data: { kind, slug, name, sortOrder: i } });
      cat[`${kind}:${slug}`] = c.id;
    }
  }

  if (MINIMAL) {
    const sections: [string, string][] = [
      ["/index.html", "/"], ["/news.html", "/news"], ["/blogs.html", "/blogs"], ["/listings.html", "/businesses"],
      ["/services.html", "/services"], ["/about.html", "/about"], ["/contact.html", "/contact"], ["/manifesto.html", "/manifesto"],
      ["/contribute.html", "/contribute"], ["/local-guide.html", "/places"],
    ];
    await db.redirect.createMany({ data: sections.map(([fromPath, toPath]) => ({ fromPath, toPath })), skipDuplicates: true });
    console.log("Seed complete (structure only: localities, categories, authors — no content).");
    return;
  }

  const tagNames = ["Udhwa Lake", "Birds", "Ramsar Site", "Sahibganj", "Jharkhand", "Education", "Board Exams", "Sports", "+2 High School Udhwa", "Rumour Check", "Digital Literacy", "Coding", "Career", "Mobile Learning"];
  const tag: Record<string, string> = {};
  for (const name of tagNames) {
    const t = await db.tag.create({ data: { name, slug: name.toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } });
    tag[name] = t.id;
  }
  const tags = (...names: string[]) => ({ connect: names.map((n) => ({ id: tag[n] })) });

  // ── Media (bundled seed images) ─────────────────────────
  const mediaDefs: Record<string, { w: number; h: number; alt: string; caption?: string; credit?: string }> = {
    "udhwa-lake-hills.jpg": { w: 698, h: 698, alt: "Udhwa Lake wetland with green marshes and the Rajmahal hills on the horizon", caption: "The wetlands of Udhwa Lake, with the Rajmahal hills beyond.", credit: "Udhwa" },
    "udhwa-lake-hyacinth.jpg": { w: 698, h: 523, alt: "Calm water of Udhwa Lake dotted with floating water hyacinth under a lilac evening sky", caption: "Water hyacinth drifting across Udhwa Lake in the evening.", credit: "Udhwa" },
    "udhwa-lake-storks.jpg": { w: 1080, h: 707, alt: "Asian openbill storks wading in the shallow water of Udhwa Lake Bird Sanctuary", caption: "Asian openbill storks feeding in the shallows of the sanctuary.", credit: "Udhwa" },
    "i-love-udhwa-sign.jpg": { w: 698, h: 523, alt: "Green 'I love Udhwa' sign beside a brick walkway at the lakeside park", caption: "The ‘I ♥ Udhwa’ sign at the lakeside.", credit: "Udhwa" },
    "haya-mart-shelves.jpg": { w: 698, h: 323, alt: "Neatly stocked shelves of groceries, biscuits and baby food at Haya Mart", caption: "Shelves at Haya Mart, Udhwa.", credit: "Haya Mart" },
    "kohinoor-restaurant-night.jpg": { w: 698, h: 523, alt: "Kohinoor Restaurant in Udhwa lit with colourful lights at night", caption: "Kohinoor Restaurant after dark.", credit: "Udhwa" },
    "hp-petrol-pump-rumour.jpg": { w: 1536, h: 1024, alt: "News graphic: petrol price hike rumour causes long queues at HP Petrol Pump, Udhwa" },
    "school-sports-2026-banner.jpg": { w: 1024, h: 696, alt: "Banner for +2 High School Udhwa Annual Sports 2026 showing a sprinter and a javelin thrower" },
    "school-sports-2026-poster.jpg": { w: 1024, h: 1536, alt: "Official poster for +2 High School Udhwa Annual Sports 2026 listing events, age categories, rules and dates" },
    "ict-championship-2025.jpg": { w: 1600, h: 1600, alt: "Poster for the Jharkhand eShiksha Mahotsav 2025 ICT Championship for classes 9–12" },
    "jac-exam-hall.jpg": { w: 400, h: 225, alt: "Students writing an examination in a school hall" },
    "computer-skills.jpg": { w: 1600, h: 1067, alt: "Hands typing on a laptop surrounded by digital interface graphics" },
    "phone-coding.jpg": { w: 512, h: 512, alt: "A hand holding a smartphone displaying code in front of a computer screen" },
    "sarfaraj-alam.jpg": { w: 506, h: 900, alt: "Sarfaraj Alam, founder of Udhwa" },
    "sanctuary-gate.jpg": { w: 1184, h: 864, alt: "Entrance gate of Udhwa Lake Bird Sanctuary with bird sculptures" },
  };
  const media: Record<string, string> = {};
  for (const [f, m] of Object.entries(mediaDefs)) {
    const row = await db.media.create({
      data: { provider: "STATIC", url: `/seed/${f}`, width: m.w, height: m.h, format: "jpg", alt: m.alt, caption: m.caption, credit: m.credit, uploadedById: founder?.id },
    });
    media[f] = row.id;
  }

  const audit = { createdById: founder?.id, updatedById: founder?.id };
  const published = (date: string) => ({ status: "PUBLISHED" as const, publishedAt: d(date) });

  // ── Places ──────────────────────────────────────────────
  const lake = await db.place.create({
    data: {
      slug: "udhwa-lake-bird-sanctuary",
      name: "Udhwa Lake Bird Sanctuary",
      summary: "Jharkhand’s only bird sanctuary — a Ganga backwater wetland of two lakes, Patauda and Berhale, declared a Ramsar Site in 2025.",
      about: html(`<p>Udhwa Lake Bird Sanctuary is a <strong>5.65 km²</strong> wetland formed by two backwater lakes of the Ganga — <strong>Patauda</strong> and <strong>Berhale</strong>. It is the only bird sanctuary in Jharkhand and was designated a <strong>Ramsar Wetland of International Importance on 1 February 2025</strong>.</p>
<p>The Asian Waterbird Census of January 2024 recorded <strong>58 bird species</strong> and <strong>18,009 individual birds</strong> here, including six globally threatened species. Winter brings migratory flocks; storks, egrets, herons and purple swamphens are seen through much of the year.</p>
<h2>Visiting</h2>
<ul><li><strong>Best season:</strong> November to March, when migratory birds arrive.</li><li><strong>Best time of day:</strong> early morning (6–9 AM) and late afternoon (4–6 PM).</li><li><strong>Nearest railway station:</strong> Barharwa Junction, about 15 km away.</li><li><strong>Things to do:</strong> bird watching, photography, nature walks and boating.</li></ul>`),
      history: html(`<p>The sanctuary was established in <strong>1991</strong> to protect resident and migratory birds, and is recognised as an Important Bird Area (IBA). It is managed by the Jharkhand Forest Department with support from the National Mission for Clean Ganga. Udhwa itself is said to be named after Uddhava, a friend of Lord Krishna.</p>`),
      address: "Udhwa, Sahibganj district, Jharkhand 816108",
      categoryId: cat["PLACE:nature"],
      localityId: udhwa.id,
      coverId: media["udhwa-lake-storks.jpg"],
      featured: true,
      verifiedAt: d("2025-10-21"),
      seoTitle: "Udhwa Lake Bird Sanctuary — Jharkhand’s only bird sanctuary",
      ...published("2025-10-21"),
      ...audit,
    },
  });
  const patauda = await db.place.create({
    data: {
      slug: "patauda-lake",
      name: "Patauda Lake",
      summary: "The deeper of Udhwa’s two sanctuary lakes — about 2 m deep, ringed with greenery and calm water favoured by nesting birds.",
      about: html(`<p>Patauda Lake is one of the two Ganga backwater lakes that make up the Udhwa Lake Bird Sanctuary. At roughly <strong>2 metres</strong> deep, it is the deeper of the pair and offers a quiet habitat for aquatic life and nesting birds. A natural channel links it to Berhale Lake, keeping the wetland alive through the year.</p>`),
      address: "Udhwa Lake Bird Sanctuary, Udhwa, Sahibganj",
      categoryId: cat["PLACE:water"],
      localityId: udhwa.id,
      coverId: media["udhwa-lake-hyacinth.jpg"],
      ...published("2025-10-21"),
      ...audit,
    },
  });
  const berhale = await db.place.create({
    data: {
      slug: "berhale-lake",
      name: "Berhale Lake",
      summary: "A shallow, vegetation-rich lake (about 70 cm deep) in the Udhwa sanctuary — ideal ground for wading birds.",
      about: html(`<p>Berhale Lake is the shallower of the two sanctuary lakes, around <strong>70 cm</strong> deep and covered with aquatic vegetation. Its plankton- and insect-rich water makes it prime feeding ground for wading birds such as egrets, herons and storks.</p>`),
      address: "Udhwa Lake Bird Sanctuary, Udhwa, Sahibganj",
      categoryId: cat["PLACE:water"],
      localityId: udhwa.id,
      coverId: media["udhwa-lake-hills.jpg"],
      ...published("2025-10-21"),
      ...audit,
    },
  });
  const school = await db.place.create({
    data: {
      slug: "plus-2-high-school-udhwa",
      name: "+2 High School Udhwa",
      summary: "Government senior secondary school in Udhwa, near the Barharwa road — host of the annual school sports meet.",
      about: html(`<p>+2 High School Udhwa is a government senior secondary school serving students from Udhwa and surrounding villages. Each January the school holds an <strong>Annual Sports Meet</strong> with track and field events in junior (up to 14) and senior (above 14) categories.</p>`),
      address: "Barharwa Road, Udhwa, Sahibganj, Jharkhand 816108",
      categoryId: cat["PLACE:education"],
      localityId: udhwa.id,
      coverId: media["school-sports-2026-banner.jpg"],
      ...published("2026-01-08"),
      ...audit,
    },
  });
  const barharwa = await db.place.create({
    data: {
      slug: "barharwa-junction",
      name: "Barharwa Junction",
      summary: "The nearest major railway station to Udhwa, about 15 km away on the Sahibganj loop line.",
      about: html(`<p>Barharwa Junction is the closest major railhead for Udhwa and the bird sanctuary, roughly <strong>15 km</strong> away and well connected by road. Most visitors arriving by train get down here and continue by auto or taxi.</p>`),
      address: "Barharwa, Sahibganj district, Jharkhand",
      categoryId: cat["PLACE:transport"],
      localityId: sahibganj.id,
      ...published("2025-10-21"),
      ...audit,
    },
  });
  const rajmahal = await db.place.create({
    data: {
      slug: "rajmahal-hills",
      name: "Rajmahal Hills",
      summary: "Ancient hill range near Udhwa, known for its geological and historical significance — visible from the lake on clear days.",
      about: html(`<p>The Rajmahal Hills rise to the west of Udhwa and frame the view across the sanctuary’s wetlands. They are among the region’s best-known geological landmarks and are a popular side trip for visitors to Udhwa.</p>`),
      address: "Rajmahal subdivision, Sahibganj district, Jharkhand",
      categoryId: cat["PLACE:landmark"],
      localityId: sahibganj.id,
      coverId: media["udhwa-lake-hills.jpg"],
      ...published("2025-10-21"),
      ...audit,
    },
  });
  await db.place.create({
    data: {
      slug: "farakka-barrage",
      name: "Farakka Barrage",
      summary: "Large barrage across the Ganga near the Jharkhand–West Bengal border, a short drive from Udhwa with wide river views.",
      about: html(`<p>Farakka Barrage is a major water-management structure on the Ganga, a short drive from Udhwa. Its long road bridge offers sweeping views of the river and is a common stop for visitors exploring the region.</p>`),
      address: "Farakka, Murshidabad district, West Bengal",
      categoryId: cat["PLACE:landmark"],
      ...published("2025-10-21"),
      ...audit,
    },
  });
  await db.place.create({
    data: {
      slug: "moti-jharna",
      name: "Moti Jharna",
      summary: "A seasonal waterfall in Sahibganj district, best after the monsoon — an easy excursion from Udhwa.",
      about: html(`<p>Moti Jharna is a waterfall in Sahibganj district that is at its fullest after the monsoon. It makes a pleasant half-day excursion when combined with a visit to Udhwa Lake.</p>`),
      address: "Sahibganj district, Jharkhand",
      categoryId: cat["PLACE:nature"],
      localityId: sahibganj.id,
      ...published("2025-10-21"),
      ...audit,
    },
  });

  // ── Businesses ──────────────────────────────────────────
  const kohinoor = await db.business.create({
    data: {
      slug: "kohinoor-restaurant",
      name: "Kohinoor Restaurant",
      summary: "Well-known family restaurant on Barharwa Road, near +2 High School Udhwa. Open daily from breakfast to dinner.",
      about: html(`<p>Kohinoor Restaurant is one of Udhwa’s best-known places to eat, popular with families and travellers passing along Barharwa Road. Look for the brightly lit frontage near the high school.</p>`),
      address: "Near +2 High School Udhwa, Barharwa Road, Udhwa, Sahibganj 816108",
      openingHours: [{ days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], opens: "07:00", closes: "21:00" }],
      hoursNote: "Open daily",
      offerings: ["Dine-in", "Family seating"],
      categoryId: cat["BUSINESS:restaurant"],
      localityId: udhwa.id,
      placeId: school.id,
      coverId: media["kohinoor-restaurant-night.jpg"],
      featured: true,
      ...published("2025-10-01"),
      ...audit,
    },
  });
  const haya = await db.business.create({
    data: {
      slug: "haya-mart",
      name: "Haya Mart",
      summary: "General store for groceries and daily needs — cosmetics, snacks and drinks, gifts and toys, books, bakery and sports goods.",
      about: html(`<p>Haya Mart is a general store on the Barharwa bypass road, near SBI Udhwa. It stocks groceries and daily essentials alongside cosmetics, chocolates and drinks, gifts and toys, books, bakery items and sports goods, at fair prices.</p><p>Owner: Imtiaz Alam.</p>`),
      address: "Barharwa By-Pass Road, near SBI Udhwa, Udhwa, Sahibganj 816108",
      phone: "+91 79798 56599",
      openingHours: [{ days: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], opens: "08:00", closes: "21:00" }],
      hoursNote: "Open daily",
      offerings: ["Groceries", "Cosmetics", "Chocolates & Drinks", "Gifts & Toys", "Books", "Bakery", "Sports goods"],
      categoryId: cat["BUSINESS:shop"],
      localityId: udhwa.id,
      coverId: media["haya-mart-shelves.jpg"],
      featured: true,
      verifiedAt: d("2025-10-01"),
      ...published("2025-10-01"),
      ...audit,
    },
  });
  const hpPump = await db.business.create({
    data: {
      slug: "hp-petrol-pump-udhwa",
      name: "HP Petrol Pump, Udhwa",
      summary: "Hindustan Petroleum fuel station on the main road in Udhwa.",
      address: "Main Road, Udhwa, Sahibganj 816108",
      offerings: ["Petrol", "Diesel"],
      categoryId: cat["BUSINESS:fuel"],
      localityId: udhwa.id,
      ...published("2026-03-06"),
      ...audit,
    },
  });

  // ── News ────────────────────────────────────────────────
  const newsPetrol = await db.newsArticle.create({
    data: {
      slug: "heavy-crowd-hp-petrol-pump-udhwa-price-hike-rumours",
      title: "Heavy Crowd at HP Petrol Pump Udhwa After Price Hike Rumours",
      excerpt: "Long queues formed at the HP Petrol Pump in Udhwa on Friday morning after unverified social media messages claimed petrol prices would rise. No hike has been announced.",
      content: file("news-petrol-pump.html"),
      authorId: authorDesk.id,
      categoryId: cat["NEWS:local"],
      localityId: udhwa.id,
      businessId: hpPump.id,
      coverId: media["hp-petrol-pump-rumour.jpg"],
      sourceName: "Udhwa on-ground report; official clarification by oil marketing companies",
      tags: tags("Rumour Check", "Sahibganj"),
      featured: true,
      ...published("2026-03-06"),
      ...audit,
    },
  });
  const newsSports = await db.newsArticle.create({
    data: {
      slug: "plus-2-high-school-udhwa-annual-sports-2026",
      title: "+2 High School Udhwa Annual Sports 2026 – Events, Dates & Rules",
      excerpt: "The school’s Annual Sports Meet returns on 19–20 January 2026. Entries open 9, 10, 15 and 16 January at the school office; each student may enter up to three events.",
      content: file("news-school-sports.html"),
      authorId: authorDesk.id,
      categoryId: cat["NEWS:announcements"],
      localityId: udhwa.id,
      placeId: school.id,
      coverId: media["school-sports-2026-banner.jpg"],
      sourceName: "Official notice, +2 High School Udhwa",
      tags: tags("Sports", "+2 High School Udhwa", "Education"),
      ...published("2026-01-08"),
      ...audit,
    },
  });
  await db.newsArticle.create({
    data: {
      slug: "jac-board-exam-feb-march-2026-teacher-deputation",
      title: "पांच माह बाद 10वीं-12वीं की परीक्षा, उत्कृष्ट विद्यालयों में अब प्रतिनियुक्त होंगे शिक्षक",
      excerpt: "झारखंड बोर्ड (JAC) की मैट्रिक-इंटर परीक्षाएँ फरवरी-मार्च 2026 में होंगी। उत्कृष्ट विद्यालयों में प्रतिनियुक्ति के लिए TNA में सफल शिक्षक 15 अक्तूबर तक ई-विद्यावाहिनी पोर्टल पर आवेदन कर सकते हैं।",
      content: file("news-jac-exam.html"),
      language: "hi",
      authorId: authorDesk.id,
      categoryId: cat["NEWS:education"],
      localityId: jharkhand.id,
      coverId: media["jac-exam-hall.jpg"],
      sourceName: "शिक्षा विभाग, झारखंड सरकार",
      tags: tags("Board Exams", "Education", "Jharkhand"),
      ...published("2025-10-04"),
      ...audit,
    },
  });
  // Imported as a DRAFT: the legacy article contains first-person quotes
  // that could not be verified. An editor should confirm or rewrite it.
  const ictDraft = await db.newsArticle.create({
    data: {
      slug: "jharkhand-ict-championship-eshiksha-mahotsav-2025",
      title: "Jharkhand Launches ICT Championship eShiksha Mahotsav 2025 for Government School Students",
      excerpt: "A four-level state-wide digital skills competition for classes 9–12 in government schools, from school level in September to the state finals in November 2025.",
      content: file("news-ict-championship.html"),
      categoryId: cat["NEWS:education"],
      localityId: jharkhand.id,
      coverId: media["ict-championship-2025.jpg"],
      sourceName: "Jharkhand Education Project Council",
      tags: tags("Education", "Digital Literacy", "Jharkhand"),
      status: "DRAFT",
      ...audit,
    },
  });

  // ── Blogs ───────────────────────────────────────────────
  const lakeBlogContent = file("blog-udhwa-lake.html");
  const blogLake = await db.blogPost.create({
    data: {
      slug: "udhwa-lake-bird-sanctuary-guide",
      title: "Udhwa Lake Bird Sanctuary – Jharkhand’s Hidden Paradise for Migratory Birds",
      excerpt: "Jharkhand’s only bird sanctuary, now a Ramsar Site: 58 bird species, the twin lakes of Patauda and Berhale, the best time to visit and how to get there.",
      content: lakeBlogContent,
      readingMinutes: readingMinutes(lakeBlogContent),
      authorId: authorSarfaraj.id,
      categoryId: cat["BLOG:nature"],
      localityId: udhwa.id,
      placeId: lake.id,
      coverId: media["udhwa-lake-storks.jpg"],
      tags: tags("Udhwa Lake", "Birds", "Ramsar Site", "Sahibganj"),
      featured: true,
      ...published("2025-10-21"),
      ...audit,
    },
  });
  const skills = file("blog-computer-skills.html");
  await db.blogPost.create({
    data: {
      slug: "computer-era-mein-skills-ka-mahatva",
      title: "Computer Era Mein Skills Ka Mahatva: Hum Kya Seekhein?",
      excerpt: "Aaj ke digital daur mein basic computer skills sirf option nahi, balki zaroorat ban chuke hain. Jaaniye kaunsi skills seekhkar aap apna future secure kar sakte hain.",
      content: skills,
      language: "hi-Latn",
      readingMinutes: readingMinutes(skills),
      authorId: authorSarfaraj.id,
      categoryId: cat["BLOG:technology"],
      coverId: media["computer-skills.jpg"],
      tags: tags("Digital Literacy", "Career"),
      ...published("2025-10-04"),
      ...audit,
    },
  });
  const phone = file("blog-phone-coding.html");
  await db.blogPost.create({
    data: {
      slug: "phone-se-coding-shuru-kare",
      title: "Phone Se Coding Shuru Kare: Python, Web Development aur Apps Bina Laptop Ke",
      excerpt: "Ab laptop ke bina bhi coding seekhna possible hai! Jaaniye kaise aap apne phone se Python, web development aur mini projects start kar sakte hain.",
      content: phone,
      language: "hi-Latn",
      readingMinutes: readingMinutes(phone),
      authorId: authorSarfaraj.id,
      categoryId: cat["BLOG:technology"],
      coverId: media["phone-coding.jpg"],
      tags: tags("Coding", "Mobile Learning"),
      ...published("2025-10-07"),
      ...audit,
    },
  });

  // ── Photos (real photographs only) ──────────────────────
  const photoDefs: [string, string, Partial<Prisma.PhotoUncheckedCreateInput>][] = [
    ["udhwa-lake-storks.jpg", "Openbill storks at Udhwa Lake", { placeId: lake.id, blogId: blogLake.id, featured: true, categoryId: cat["PHOTO:wildlife"] }],
    ["udhwa-lake-hills.jpg", "Udhwa wetlands and the Rajmahal hills", { placeId: lake.id, featured: true, categoryId: cat["PHOTO:landscape"] }],
    ["udhwa-lake-hyacinth.jpg", "Evening on Patauda Lake", { placeId: patauda.id, categoryId: cat["PHOTO:landscape"] }],
    ["i-love-udhwa-sign.jpg", "‘I ♥ Udhwa’ at the lakeside", { placeId: lake.id, featured: true, categoryId: cat["PHOTO:community"] }],
    ["kohinoor-restaurant-night.jpg", "Kohinoor Restaurant at night", { businessId: kohinoor.id, categoryId: cat["PHOTO:community"] }],
    ["haya-mart-shelves.jpg", "Inside Haya Mart", { businessId: haya.id, categoryId: cat["PHOTO:community"] }],
  ];
  for (const [f, title, rel] of photoDefs) {
    await db.photo.create({
      data: { mediaId: media[f], title, caption: mediaDefs[f].caption, credit: mediaDefs[f].credit, contributorId: founder?.id, ...rel, ...published("2025-10-21") },
    });
  }
  // (Berhale / Rajmahal reuse the lake image as cover only.)
  void berhale; void rajmahal; void barharwa;

  // ── Legacy URL redirects (old udhwa.in paths) ───────────
  const redirects: [string, string][] = [
    ["/index.html", "/"],
    ["/news.html", "/news"],
    ["/blogs.html", "/blogs"],
    ["/listings.html", "/businesses"],
    ["/services.html", "/services"],
    ["/about.html", "/about"],
    ["/contact.html", "/contact"],
    ["/manifesto.html", "/manifesto"],
    ["/contribute.html", "/contribute"],
    ["/local-guide.html", "/places"],
    ["/news/news-2.html", "/news/jac-board-exam-feb-march-2026-teacher-deputation"],
    ["/news/news-3.html", `/news/${newsSports.slug}`],
    ["/news/news-4.html", `/news/${newsPetrol.slug}`],
    ["/blogs/blog-1.html", "/blogs/computer-era-mein-skills-ka-mahatva"],
    ["/blogs/blog-2.html", "/blogs/phone-se-coding-shuru-kare"],
    ["/blogs/blog-3.html", `/blogs/${blogLake.slug}`],
  ];
  // news-1 was the ICT Championship article, imported as a draft until its quotes are verified:
  // send visitors to the news list for now (temporary, so it can point at the article once published).
  redirects.push(["/news/news-1.html", "/news"]);
  await db.redirect.createMany({
    data: redirects.map(([fromPath, toPath]) => ({ fromPath, toPath, permanent: fromPath !== "/news/news-1.html" })),
    skipDuplicates: true,
  });

  await db.auditLog.create({
    data: {
      actorId: founder?.id,
      action: "import",
      entityType: "NewsArticle",
      entityId: ictDraft.id,
      summary: "Imported legacy article as draft — contains first-person quotes that need verification before publishing.",
    },
  });

  if (SAMPLES) await seedSamples({ cat, udhwa: udhwa.id, kohinoor: kohinoor.id, lake: lake.id, haya: haya.id });

  await reindexMediaUsage();
  console.log(`Seed complete${SAMPLES ? " (with sample listings)" : ""}.`);
}

/** Development-only sample data: services and a review queue to work through. */
async function seedSamples(ctx: { cat: Record<string, string>; udhwa: string; kohinoor: string; lake: string; haya: string }) {
  const { cat } = ctx;
  const services: Omit<Prisma.ServiceUncheckedCreateInput, "slug">[] = [
    { name: "Home Electrician", summary: "House wiring, fan and light fitting, inverter connections and fault repairs for homes and shops.", providerType: "INDIVIDUAL", providerName: "Local electrician (sample)", serviceArea: "Udhwa and nearby villages", availability: "8 AM – 8 PM, daily", highlights: ["House wiring", "Repairs", "Inverter setup"], categoryId: cat["SERVICE:home-repair"] },
    { name: "Plumbing Repairs", summary: "Pipe leaks, tap and tank fitting, motor connections and bathroom installations.", providerType: "INDIVIDUAL", providerName: "Local plumber (sample)", serviceArea: "Udhwa block", availability: "7 AM – 9 PM, daily", highlights: ["Leak repair", "Tank & motor fitting"], categoryId: cat["SERVICE:home-repair"] },
    { name: "Home Tuition, Classes 6–12", summary: "Maths, science and English tuition for school students, with board exam preparation.", providerType: "INDIVIDUAL", providerName: "Private tutor (sample)", serviceArea: "Udhwa", availability: "3 PM – 7 PM, Mon–Sat", highlights: ["Maths & Science", "Board exam prep"], categoryId: cat["SERVICE:education"] },
    { name: "Auto & Taxi to Barharwa Station", summary: "Local trips, station pick-up and drop at Barharwa Junction, and day trips to Rajmahal and Farakka.", providerType: "INDIVIDUAL", providerName: "Local driver (sample)", serviceArea: "Udhwa – Barharwa – Rajmahal", availability: "On call", highlights: ["Station transfers", "Day trips"], categoryId: cat["SERVICE:transport"] },
    { name: "Mobile Phone Repair", summary: "Screen and battery replacement, charging-port repairs and software fixes for most brands.", providerType: "INDIVIDUAL", providerName: "Mobile repair shop (sample)", serviceArea: "Udhwa market", availability: "10 AM – 8 PM, Mon–Sat", highlights: ["Screen replacement", "Battery", "Software"], categoryId: cat["SERVICE:electronics"] },
    { name: "Computer & Laptop Repair", summary: "Hardware repair, OS installation, virus removal and data recovery.", providerType: "INDIVIDUAL", providerName: "Computer technician (sample)", serviceArea: "Udhwa", availability: "10 AM – 7 PM, Mon–Sat", highlights: ["Hardware", "OS install", "Data recovery"], categoryId: cat["SERVICE:electronics"] },
    { name: "Wedding & Event Photography", summary: "Photo and video coverage for weddings, school functions and family events.", providerType: "INDIVIDUAL", providerName: "Event photographer (sample)", serviceArea: "Sahibganj district", availability: "By booking", highlights: ["Weddings", "Events", "Video"], categoryId: cat["SERVICE:events"] },
    { name: "Party & Group Orders", summary: "Bulk food orders for family functions and groups, prepared by the Kohinoor kitchen.", providerType: "BUSINESS", providerName: "Kohinoor Restaurant", businessId: ctx.kohinoor, serviceArea: "Udhwa", availability: "Order a day in advance", highlights: ["Group orders"], categoryId: cat["SERVICE:events"] },
  ];
  for (const s of services) {
    await db.service.create({
      data: { ...s, slug: s.name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), localityId: ctx.udhwa, status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  const resident = await db.user.upsert({
    where: { email: "resident.sample@udhwa.dev" },
    update: {},
    create: { email: "resident.sample@udhwa.dev", name: "Rahul Kumar (sample)", username: "rahul-sample", bio: "Lives near Udhwa Lake. Sample account for development." },
  });
  await db.contribution.create({
    data: {
      type: "PLACE",
      title: "Udhwa Block Office",
      userId: resident.id,
      payload: { name: "Udhwa Block Office", summary: "Block development office for Udhwa — certificates, schemes and local administration.", address: "Udhwa, Sahibganj", categorySlug: "landmark", details: "Office hours are usually 10 AM to 5 PM on working days." },
    },
  });
  await db.contribution.create({
    data: {
      type: "BLOG",
      title: "Winter birding checklist for Udhwa Lake",
      userId: resident.id,
      status: "UNDER_REVIEW",
      payload: {
        title: "Winter birding checklist for Udhwa Lake",
        excerpt: "What to bring, where to stand and which birds to look for on a December morning at the sanctuary.",
        content: html("<p>Reach the lake by 6:30 AM, when the mist lifts and the storks start feeding.</p><h2>What to bring</h2><ul><li>Binoculars</li><li>A warm layer</li><li>Water</li></ul>"),
      },
    },
  });
  await db.correction.create({
    data: {
      kind: "UPDATE",
      message: "Haya Mart now opens at 7:30 AM on Sundays.",
      suggestedChange: "Sunday hours: 07:30 – 21:00",
      userId: resident.id,
      businessId: ctx.haya,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await appDb.$disconnect();
  });
