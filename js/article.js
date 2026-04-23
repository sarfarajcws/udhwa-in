document.addEventListener("DOMContentLoaded", loadRelatedPosts);

async function loadRelatedPosts() {
  try {
    const res = await fetch("../data/blogs/blogs.json");
    const blogs = await res.json();

    const container = document.getElementById("related-posts");
    if (!container) return;

    // 🔍 current category
    const categoryEl = document.querySelector(".category-badge");
    if (!categoryEl) return;

    let currentCategory = categoryEl.textContent.trim().toLowerCase();

    // optional mapping (future safe)
    const categoryMap = {
      nature: "environment",
      tech: "technology",
    };

    currentCategory = categoryMap[currentCategory] || currentCategory;

    // 🔗 current page url (exclude current article)
    const currentUrl = window.location.pathname.split("/").pop();

    // 🎯 same category filter
    let related = blogs.filter((b) => {
      const blogUrl = b.link?.split("/").pop();
      return (
        b.category.toLowerCase() === currentCategory &&
        blogUrl !== currentUrl
      );
    });

    // 🆕 latest first
    related.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 🔥 fallback (ensure 3 posts)
    if (related.length < 3) {
      const extra = blogs
        .filter((b) => b.category.toLowerCase() !== currentCategory)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      related = [...related, ...extra];
    }

    // 🎯 final 3
    related = related.slice(0, 3);

    renderRelatedPosts(related);

  } catch (err) {
    console.error("Related posts error:", err);
    showError();
  }
}

// 🧱 render cards
function renderRelatedPosts(posts) {
  const container = document.getElementById("related-posts");
  if (!container) return;

  if (!posts.length) {
    container.innerHTML = `
      <p class="text-center text-ink-muted col-span-3">
        No related posts found
      </p>
    `;
    return;
  }

  container.innerHTML = posts
    .map(
      (blog) => `
    <article class="blog-card glass-card rounded-2xl overflow-hidden border border-black/5 hover:border-black/15 transition-all duration-300">
      
      <div class="h-52 overflow-hidden">
        <img src="${blog.image}" 
             alt="${blog.title}" 
             class="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
      </div>

      <div class="p-6 flex flex-col gap-3">

        ${blog.category ? `
          <span class="text-xs font-semibold tracking-wider uppercase text-blue-700 bg-blue-50 px-3 py-1 rounded-full w-fit">
            ${blog.category}
          </span>` : ''}

        <h3 class="font-display text-xl font-bold text-ink leading-snug">
          ${blog.title}
        </h3>

        <p class="text-sm text-ink-muted leading-relaxed">
          ${blog.excerpt}
        </p>

        <div class="flex items-center justify-between mt-2 text-xs text-ink-muted/70">
          <span>
            ${formatDate(blog.date)}
            ${blog.readTime ? ` · ${blog.readTime} min` : ''}
            ${blog.author ? ` · ${blog.author}` : ''}
          </span>

          <a href="${blog.link}" class="font-semibold text-ink hover:underline">
            Read More →
          </a>
        </div>

        ${blog.tags && blog.tags.length ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${blog.tags.map(tag => `
              <span class="text-[10px] bg-black/5 px-2 py-1 rounded">
                #${tag}
              </span>
            `).join('')}
          </div>
        ` : ''}

      </div>
    </article>
  `
    )
    .join("");
}

// 📅 date format
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ❌ error fallback
function showError() {
  const container = document.getElementById("related-posts");
  if (!container) return;

  container.innerHTML = `
    <p class="text-center text-red-500 col-span-3">
      Failed to load related posts
    </p>
  `;
}