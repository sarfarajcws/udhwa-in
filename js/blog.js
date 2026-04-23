let allBlogs = [];
let filteredBlogs = [];
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

    const category = pill.textContent.trim();
    filterByCategory(category);
  });
});

document.addEventListener('DOMContentLoaded', function() {
  loadBlogs();
});

async function loadBlogs() {
  try {
    showLoading(true);

    const response = await fetch('data/blogs/blogs.json');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();

    allBlogs = JSON.parse(text);
    filteredBlogs = allBlogs;

    showLoading(false);
    renderBlogPage(1);

  } catch (error) {
    showLoading(false);
    showError('Unable to load blogs: ' + error.message);
  }
}

function renderBlogPage(page) {
  currentPage = page;

  // No result case
  if (filteredBlogs.length === 0) {
    document.getElementById('blog-posts').innerHTML = `
      <p class="text-center text-ink-muted col-span-3">
        No blogs found in this category
      </p>
    `;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const blogsToShow = filteredBlogs.slice(startIndex, endIndex);

  renderBlogCards(blogsToShow);
  renderPagination();
}

function renderBlogCards(blogs) {
  const container = document.getElementById('blog-posts');

  container.innerHTML = blogs.map(blog => `
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
  `).join('');
}

function renderPagination() {
  const totalPages = Math.ceil(filteredBlogs.length / postsPerPage);
  const container = document.getElementById('pagination');

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  html += `
    <button onclick="changePage(${currentPage - 1})"
      ${currentPage === 1 ? 'disabled' : ''}
      class="w-10 h-10 rounded-lg border border-ink/15 text-ink-muted text-sm hover:bg-black/5 transition-colors">
      ←
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button onclick="changePage(${i})"
        class="w-10 h-10 rounded-lg text-sm ${
          i === currentPage
            ? 'bg-ink text-cream font-semibold'
            : 'border border-ink/15 text-ink-muted hover:bg-black/5'
        }">
        ${i}
      </button>
    `;
  }

  html += `
    <button onclick="changePage(${currentPage + 1})"
      ${currentPage === totalPages ? 'disabled' : ''}
      class="w-10 h-10 rounded-lg border border-ink/15 text-ink-muted text-sm hover:bg-black/5 transition-colors">
      →
    </button>
  `;

  container.innerHTML = html;
}

function filterByCategory(category) {
  if (category.toLowerCase() === "all") {
    filteredBlogs = allBlogs;
  } else {
    filteredBlogs = allBlogs.filter(
      blog => blog.category.toLowerCase() === category.toLowerCase()
    );
  }

  renderBlogPage(1);
}

function changePage(page) {
  const totalPages = Math.ceil(filteredBlogs.length / postsPerPage);

  if (page < 1 || page > totalPages || page === currentPage) return;

  window.scrollTo({ top: 0, behavior: 'smooth' });

  setTimeout(() => {
    renderBlogPage(page);
  }, 100);
}

function showLoading(show) {
  const el = document.getElementById('loading');
  if (!el) return;

  show ? el.classList.remove('hidden') : el.classList.add('hidden');
}

function showError(message) {
  document.getElementById('blog-posts').innerHTML = `
    <div class="text-center">
      <h3>Error Loading Blogs</h3>
      <p>${message}</p>
      <button onclick="loadBlogs()">Try Again</button>
    </div>
  `;
}