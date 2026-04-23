document.addEventListener("DOMContentLoaded", function () {
  loadRecentContent();
});

// Function to take data from Shared JSON
async function loadRecentContent() {
  try {
    const response = await fetch("data/shared/recentPost.json");
    const data = await response.json();

    renderNewsCards(data.recentNews.slice(0, 3), "latest-news");
    renderBlogCards(data.recentBlogs.slice(0, 3), "latest-blogs");
  } catch (error) {
    console.error("Error loading recent content:", error);
    document.getElementById("latest-news").innerHTML =
      "<p>Unable to load news</p>";
    document.getElementById("latest-blogs").innerHTML =
      "<p>Unable to load blogs</p>";
  }
}

// RENDERING FUNCTION
function renderNewsCards(news, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = news
    .map(
      (item) => `
    <article class="news-card glass-card rounded-2xl overflow-hidden border border-black/5 hover:border-black transition-all duration-200">
          <div class="h-52 overflow-hidden bg-gray-100">
            <img src="${item.image}"
                 alt="${item.title}" 
                 class="h-full object-cover hover:scale-105 transition-transform duration-500"
                 onerror="this.src='https://images.pexels.com/photos/270557/pexels-photo-270557.jpeg'"
                 />
          </div>
          <div class="p-6 flex flex-col gap-3">
            <span class="text-xs font-semibold tracking-wider uppercase text-ink-muted bg-black/5 px-3 py-1 rounded-full w-fit">${item.category}</span>
            <h3 class="font-display text-xl font-bold text-ink leading-snug">${item.title}</h3>
            <p class="text-sm text-ink-muted leading-relaxed">${item.excerpt}</p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-ink-muted/70">${formatDate(item.date)}</span>
              <a href="${item.link}" class="text-xs font-semibold text-ink hover:underline">Read More →</a>
            </div>
          </div>
        </article>
    `,
    )
    .join("");
}

function renderBlogCards(blogs, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = blogs
    .map(
      (item) => `
    <article class="news-card glass-card rounded-2xl overflow-hidden border border-black/5 hover:border-black transition-all duration-200">
          <div class="h-52 overflow-hidden bg-gray-100">
            <img src="${item.image}"
                 alt="${item.title}" class="h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
          <div class="p-6 flex flex-col gap-3">
            <span class="text-xs font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit">${item.category}</span>
            <h3 class="font-display text-xl font-bold text-ink leading-snug">${item.title}</h3>
            <p class="text-sm text-ink-muted leading-relaxed">${item.excerpt}</p>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-ink-muted/70">${formatDate(item.date)}</span>
              <a href="${item.link}" class="text-xs font-semibold text-ink hover:underline">Read More →</a>
            </div>
          </div>
        </article>
    `,
    )
    .join("");
}
