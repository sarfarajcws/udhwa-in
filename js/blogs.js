// Blogs page scripts with pagination

let allBlogs = [];
let currentPage = 1;
const postsPerPage = 6;

document.addEventListener('DOMContentLoaded', function() {
    loadBlogs();
});

async function loadBlogs() {
    try {
        showLoading(true);
        
        const response = await fetch('data/blogs/blogs.json');
        allBlogs = await response.json();
        
        // Sort by date (newest first)
        allBlogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        showLoading(false);
        renderBlogsPage(1);
        
    } catch (error) {
        console.error('Error loading blogs:', error);
        showLoading(false);
        showError('Unable to load blogs. Please try again later.');
    }
}

function renderBlogsPage(page) {
    currentPage = page;
    
    const startIndex = (page - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const blogsToShow = allBlogs.slice(startIndex, endIndex);
    
    renderBlogCards(blogsToShow);
    renderPagination();
}

function renderBlogCards(blogs) {
    const container = document.getElementById('blogs-posts');
    
    if (blogs.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No Blogs Found</h3>
                <p>Check back later for new stories and insights from Udhwa.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = blogs.map(blog => `
        <div class="card blog-card" data-category="${blog.category || 'general'}">
            <img src="${blog.image}" alt="${blog.title}" class="card-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'">
            <div class="card-content">
                ${blog.category ? `<span class="blog-category">${blog.category}</span>` : ''}
                <h3 class="card-title">${blog.title}</h3>
                <div class="card-date">
                    ${formatDate(blog.date)}
                    ${blog.readTime ? `<span class="blog-read-time">• ${blog.readTime} min read</span>` : ''}
                </div>
                <p class="card-text">${blog.excerpt}</p>
                <a href="${blog.link}" class="card-button">Read Full Article</a>
            </div>
        </div>
    `).join('');
}

function renderPagination() {
    const totalPages = Math.ceil(allBlogs.length / postsPerPage);
    const paginationContainer = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button onclick="changePage(${currentPage - 1})" 
                ${currentPage === 1 ? 'disabled' : ''}
                class="pagination-prev">
            ← Previous
        </button>
    `;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis
    if (startPage > 1) {
        paginationHTML += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" 
                    ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `;
    }
    
    // Last page and ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" 
                ${currentPage === totalPages ? 'disabled' : ''}
                class="pagination-next">
            Next →
        </button>
    `;
    
    // Page info
    const startItem = (currentPage - 1) * postsPerPage + 1;
    const endItem = Math.min(currentPage * postsPerPage, allBlogs.length);
    
    paginationHTML = `
        <div class="pagination-info">
            Showing ${startItem}-${endItem} of ${allBlogs.length} blog articles
        </div>
        <div class="pagination-buttons">
            ${paginationHTML}
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(allBlogs.length / postsPerPage);
    
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Small delay for better UX
    setTimeout(() => {
        renderBlogsPage(page);
    }, 100);
}

function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (show) {
        loadingElement.classList.remove('hidden');
    } else {
        loadingElement.classList.add('hidden');
    }
}

function showError(message) {
    const container = document.getElementById('blogs-posts');
    container.innerHTML = `
        <div class="no-results">
            <h3>Error Loading Content</h3>
            <p>${message}</p>
            <button onclick="loadBlogs()" style="margin-top: 15px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                Try Again
            </button>
        </div>
    `;
}

// Add some CSS for the new pagination elements
const additionalStyles = `
    .pagination-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .pagination-ellipsis {
        padding: 10px 8px;
        color: var(--text-light);
    }
    
    .pagination-prev,
    .pagination-next {
        min-width: 80px;
    }
    
    @media (max-width: 480px) {
        .pagination-buttons {
            gap: 4px;
        }
        
        .pagination-buttons button {
            padding: 8px 12px;
            font-size: 0.9rem;
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);