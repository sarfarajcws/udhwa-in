let allListings = [];
let filteredListings = [];
let currentPage = 1;
const postsPerPage = 6;


// Category filter
document.querySelectorAll(".category-pill").forEach((pill) => {
  pill.addEventListener("click", () => {

    // UI toggle
    document.querySelectorAll(".category-pill").forEach((p) => {
      p.classList.remove("active");
      p.classList.add("text-ink-muted");
    });

    pill.classList.add("active");
    pill.classList.remove("text-ink-muted");

    const category = pill.textContent.trim().toLowerCase();
    filterListings(category);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  loadListings();
});


// LOAD DATA
async function loadListings() {
  try {
    const res = await fetch("data/listings/listings.json");
    const data = await res.json();

    allListings = data;
    filteredListings = data;

    renderListingPage(1);

  } catch (err) {
    console.error(err);
    const el = document.getElementById("listing-posts");
    if (el) el.innerHTML = "<p>Failed to load listings</p>";
  }
}


// PAGINATION WRAPPER
function renderListingPage(page) {
  currentPage = page;

  const container = document.getElementById("listing-posts");
  if (!container) return;

  // ❗ No result
  if (filteredListings.length === 0) {
    container.innerHTML = `
      <p class="text-center text-ink-muted col-span-3">
        No listings found
      </p>
    `;
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  const start = (page - 1) * postsPerPage;
  const end = start + postsPerPage;
  const listingsToShow = filteredListings.slice(start, end);

  renderListings(listingsToShow);
  renderPagination();
}


// RENDER CARDS
function renderListings(listings) {
  const container = document.getElementById("listing-posts");
  if (!container) return;

  container.innerHTML = listings.map(item => `
    <div class="listing-card glass-card rounded-2xl overflow-hidden border border-black/5 hover:border-black/15 transition-all duration-300">

      <div class="h-48 overflow-hidden">
        <img src="${item.image}" alt="${item.name}" 
             class="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
      </div>

      <div class="p-6 flex flex-col gap-3">

        <span class="text-xs font-semibold uppercase bg-black/5 px-3 py-1 rounded-full w-fit">
          ${item.category}
        </span>

        <h3 class="font-display text-xl font-bold text-ink">
          ${item.name}
        </h3>

        <p class="text-sm text-ink-muted">
          ${item.description}
        </p>

        <div class="space-y-1 text-sm text-ink-muted">
          <p>📍 ${item.address}</p>
          ${item.owner ? `<p>👤 ${item.owner}</p>` : ""}
          <p>📞 ${item.phone}</p>
          <p>🕐 ${item.timing}</p>
        </div>

        <div class="flex gap-2 mt-2">
          <a href="tel:${item.phone}" class="flex-1 text-center text-xs font-semibold bg-ink text-cream py-2.5 rounded-xl">
            Call
          </a>
          <a href="#" class="flex-1 text-center text-xs font-semibold border border-ink/20 py-2.5 rounded-xl">
            Directions
          </a>
        </div>

      </div>
    </div>
  `).join("");
}


// PAGINATION UI
function renderPagination() {
  const totalPages = Math.ceil(filteredListings.length / postsPerPage);
  const container = document.getElementById("pagination");

  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = "";
    return;
  }

  let html = "";

  // ← Prev
  html += `
    <button onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? "disabled" : ""}
      class="w-10 h-10 rounded-lg border border-ink/15 text-ink-muted text-sm hover:bg-black/5">
      ←
    </button>
  `;

  // Numbers
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button onclick="changePage(${i})"
        class="w-10 h-10 rounded-lg text-sm ${
          i === currentPage
            ? "bg-ink text-cream font-semibold"
            : "border border-ink/15 text-ink-muted hover:bg-black/5"
        }">
        ${i}
      </button>
    `;
  }

  // → Next
  html += `
    <button onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPages ? "disabled" : ""}
      class="w-10 h-10 rounded-lg border border-ink/15 text-ink-muted text-sm hover:bg-black/5">
      →
    </button>
  `;

  container.innerHTML = html;
}


// FILTER
function filterListings(category) {
  if (category === "all listings") {
    filteredListings = allListings;
  } else {
    filteredListings = allListings.filter(item =>
      item.category.toLowerCase() === category
    );
  }

  renderListingPage(1); // reset page
}


// CHANGE PAGE
function changePage(page) {
  const totalPages = Math.ceil(filteredListings.length / postsPerPage);

  if (page < 1 || page > totalPages || page === currentPage) return;

  window.scrollTo({ top: 0, behavior: "smooth" });

  setTimeout(() => {
    renderListingPage(page);
  }, 100);
}