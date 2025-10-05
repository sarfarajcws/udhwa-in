document.addEventListener('DOMContentLoaded', function() {
    loadRecentContent();
});

// NEW FUNCTION - Shared JSON se data lega
async function loadRecentContent() {
    try {
        const response = await fetch('data/shared/recent-posts.json');
        const data = await response.json();
        
        renderNewsCards(data.recentNews, 'latest-news');
        renderBlogCards(data.recentBlogs, 'latest-blogs');
        
    } catch (error) {
        console.error('Error loading recent content:', error);
        document.getElementById('latest-news').innerHTML = '<p>Unable to load news</p>';
        document.getElementById('latest-blogs').innerHTML = '<p>Unable to load blogs</p>';
    }
}

// EXISTING FUNCTIONS - Same rahenge
function renderNewsCards(news, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = news.map(item => `
        <div class="card home-news-card">
            <img src="${item.image}" alt="${item.title}" class="card-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1495020689067-958852a7765e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-date">${formatDate(item.date)}</div>
                <p class="card-text">${item.excerpt}</p>
                <a href="${item.link}" class="card-button">Read More</a>
            </div>
        </div>
    `).join('');
}

function renderBlogCards(blogs, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = blogs.map(item => `
        <div class="card home-blog-card">
            <img src="${item.image}" alt="${item.title}" class="card-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-date">${formatDate(item.date)}</div>
                <p class="card-text">${item.excerpt}</p>
                <a href="${item.link}" class="card-button">Read More</a>
            </div>
        </div>
    `).join('');
}