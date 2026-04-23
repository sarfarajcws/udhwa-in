let allNews = [];
let filteredNews = [];
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

    // 🔥 category pass karo
    const category = pill.textContent.trim();
    filterByCategory(category);
  });
});

document.addEventListener('DOMContentLoaded', function() {
  loadNews();
})

async function loadNews() {
  try {
    // console.log('News loading started...');
    showLoading(true);

    const response = await fetch('data/news/news.json');
    // console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const text = await response.text();
    // console.log('Raw JSON data:', text);

    allNews = JSON.parse(text);
    filteredNews = allNews;
    // console.log('Parsed NEWS data', allNews);

    showLoading(false);
    renderNewsPage(1);
    
  } catch (error) {
    // console.error('Full error details:', error);
    // console.error('Error stack', error.stack);
    showLoading(false);
    showError('Unable to load news:' + error.message);
  }
}

function renderNewsPage(page) {
  currentPage = page;

  // 🔥 No result case
  if (filteredNews.length === 0) {
    document.getElementById('news-posts').innerHTML = `
      <p class="text-center text-ink-muted col-span-3">
        No news found in this category
      </p>
    `;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const newsToShow = filteredNews.slice(startIndex, endIndex);

  renderNewsCards(newsToShow);
  renderPagination();
}

function renderNewsCards(news) {
  const container = document.getElementById('news-posts');

  container.innerHTML = news.map(item => `
        <article class="news-card glass-card rounded-2xl overflow-hidden border border-black/6 hover:border-black/18 transition-all duration-300">
          <div class="h-52 overflow-hidden bg-gray-100">
            <img src="${item.image}" alt="${item.title}" class="h-full hover:scale-105 transition-transform duration-500" />
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
    `).join('')
}

function renderPagination() {
  const totalPages = Math.ceil(filteredNews.length / postsPerPage);
  const container = document.getElementById('pagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // ← Prev button
  html += `
    <button onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? 'disabled' : ''}
      class="w-10 h-10 rounded-lg border border-ink/15 text-ink-muted text-sm font-medium hover:bg-black/5 transition-colors">
      ←
    </button>
  `;

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button onclick="changePage(${i})"
        class="w-10 h-10 rounded-lg text-sm font-medium ${
          i === currentPage
            ? 'bg-ink text-cream font-semibold'
            : 'border border-ink/15 text-ink-muted hover:bg-black/5'
        }">
        ${i}
      </button>
    `;
  }

  // → Next button
  html += `
    <button onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPages ? 'disabled' : ''}
      class="w-10 h-10 rounded-lg border border-ink/15 text-ink-muted text-sm font-medium hover:bg-black/5 transition-colors">
      →
    </button>
  `;

  container.innerHTML = html;
}

function filterByCategory(category) {
  if (category.toLowerCase() === "all") {
    filteredNews = allNews;
  } else {
    filteredNews = allNews.filter(
      item => item.category.toLowerCase() === category.toLowerCase()
    );
  }

  renderNewsPage(1);
}

function changePage(page) {
  const totalPages = Math.ceil(allNews.length / postsPerPage);

  if (page < 1 || page > totalPages || page === currentPage) {
    return;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  setTimeout(() => {
    renderNewsPage(page);
  }, 100);
}

function showLoading(show) {
  const loadingElement = document.getElementById('loading');

  if (!loadingElement) return; // 🔥 important

  if (show) {
    loadingElement.classList.remove('hidden');
  } else {
    loadingElement.classList.add('hidden');
  }
}

function showError(message) {
    const container = document.getElementById('news-posts');
    container.innerHTML = `
        <div class="no-results">
            <h3>Error Loading Content</h3>
            <p>${message}</p>
            <button onclick="loadNews()" style="margin-top: 15px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                Try Again
            </button>
        </div>
    `;
}