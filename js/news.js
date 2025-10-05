// News page scripts with pagination

let allNews = [];
let currentPage = 1;
const postsPerPage = 6;

document.addEventListener('DOMContentLoaded', function() {
    loadNews();
});

// js/news.js - yeh updated function try karo:
async function loadNews() {
    try {
        console.log('🔄 News loading started...');
        showLoading(true);
        
        // Test different paths
        const response = await fetch('./data/news/news.json');
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('📄 Raw JSON data:', text);
        
        allNews = JSON.parse(text);
        console.log('✅ Parsed news data:', allNews);
        
        showLoading(false);
        renderNewsPage(1);
        
    } catch (error) {
        console.error('❌ Full error details:', error);
        console.error('❌ Error stack:', error.stack);
        showLoading(false);
        showError('Unable to load news: ' + error.message);
    }
}

function renderNewsPage(page) {
    currentPage = page;
    
    const startIndex = (page - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const newsToShow = allNews.slice(startIndex, endIndex);
    
    renderNewsCards(newsToShow);
    renderPagination();
}

// js/news.js - Line 73 ke paas
function renderNewsCards(news) {
    const container = document.getElementById('news-posts');
    
    container.innerHTML = news.map(item => `
        <div class="card news-card">
            <img src="${item.image}" alt="${item.title}" class="card-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-date">${formatDate(item.date)}</div>
                <p class="card-text">${item.excerpt}</p>  <!-- CHANGE: excerpt use karo -->
                <a href="${item.link}" class="card-button">Read Full Story</a>
            </div>
        </div>
    `).join('');
}

function renderPagination() {
    const totalPages = Math.ceil(allNews.length / postsPerPage);
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
    const endItem = Math.min(currentPage * postsPerPage, allNews.length);
    
    paginationHTML = `
        <div class="pagination-info">
            Showing ${startItem}-${endItem} of ${allNews.length} news articles
        </div>
        <div class="pagination-buttons">
            ${paginationHTML}
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(allNews.length / postsPerPage);
    
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Small delay for better UX
    setTimeout(() => {
        renderNewsPage(page);
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