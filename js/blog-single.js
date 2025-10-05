// Individual Blog Post Scripts - Clean Version

let currentBlogId = null;
let allBlogPosts = [];

function showError(message) {
    const content = document.getElementById('blog-content');
    content.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #666;">
            <h3 style="color: #000; margin-bottom: 15px;">Error</h3>
            <p>${message}</p>
            <a href="../blogs.html" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Back to Blogs</a>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    currentBlogId = getBlogIdFromUrl();
    loadBlogPost();
});

function getBlogIdFromUrl() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    const match = filename.match(/blog-(\d+)\.html/);
    return match ? parseInt(match[1]) : 1;
}

async function loadBlogPost() {
    try {
        const response = await fetch('../data/blogs/blog-posts.json');
        
        if (!response.ok) {
            throw new Error('JSON file not found');
        }
        
        allBlogPosts = await response.json();
        
        const currentPost = allBlogPosts.find(post => post.id === currentBlogId);
        
        if (currentPost) {
            renderBlogPost(currentPost);
            loadRelatedBlogs(currentPost);
            setupNavigation(currentPost);
        } else {
            showError('Blog post not found');
        }
        
    } catch (error) {
        console.error('Error loading blog post:', error);
        showError('Unable to load blog post: ' + error.message);
    }
}

function renderBlogPost(post) {
    document.title = `${post.title} - udhwa.in`;
    document.getElementById('blog-title').textContent = post.title;
    document.getElementById('blog-date').textContent = formatDate(post.date);
    document.getElementById('blog-image').src = post.image;
    document.getElementById('blog-content').innerHTML = formatBlogContent(post.content);
    
    // Update category if available
    if (post.category) {
        document.getElementById('blog-category').textContent = post.category;
    }
    
    // Load tags if available
    if (post.tags && post.tags.length > 0) {
        loadBlogTags(post.tags);
    }
}

function formatBlogContent(content) {
    return content
        .split('\n\n')
        .map(paragraph => {
            if (paragraph.startsWith('## ')) {
                return `<h2>${paragraph.substring(3)}</h2>`;
            }
            if (paragraph.startsWith('### ')) {
                return `<h3>${paragraph.substring(4)}</h3>`;
            }
            if (paragraph.startsWith('> ')) {
                return `<blockquote>${paragraph.substring(2)}</blockquote>`;
            }
            if (paragraph.startsWith('• ')) {
                const items = paragraph.split('\n').map(item =>
                    item.startsWith('• ') ? `<li>${item.substring(2)}</li>` : ''
                ).join('');
                return `<ul>${items}</ul>`;
            }
            return `<p>${paragraph}</p>`;
        })
        .join('');
}

function loadBlogTags(tags) {
    const tagsContainer = document.getElementById('blog-tags');
    tagsContainer.innerHTML = tags.map(tag =>
        `<span class="tag">#${tag}</span>`
    ).join('');
}

function loadRelatedBlogs(currentPost) {
    const relatedContainer = document.getElementById('related-blogs');
    
    if (!currentPost.related || currentPost.related.length === 0) {
        const relatedPosts = allBlogPosts
            .filter(post => post.id !== currentPost.id)
            .slice(0, 3);
        renderRelatedBlogs(relatedPosts, relatedContainer);
        return;
    }
    
    const relatedPosts = allBlogPosts.filter(post =>
        currentPost.related.includes(post.id)
    );
    renderRelatedBlogs(relatedPosts, relatedContainer);
}

function renderRelatedBlogs(posts, container) {
    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">No related blogs found.</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="card">
            <img src="${post.image}" alt="${post.title}" class="card-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'">
            <div class="card-content">
                <h3 class="card-title">${post.title}</h3>
                <div class="card-date">${formatDate(post.date)}</div>
                <p class="card-text">${truncateText(post.content, 100)}</p>
                <a href="blog-${post.id}.html" class="card-button">Read More</a>
            </div>
        </div>
    `).join('');
}

function setupNavigation(currentPost) {
    const currentIndex = allBlogPosts.findIndex(post => post.id === currentPost.id);
    
    // Previous post
    const prevPost = allBlogPosts[currentIndex - 1];
    const prevBtn = document.getElementById('prev-blog');
    if (prevPost) {
        prevBtn.href = `blog-${prevPost.id}.html`;
    } else {
        prevBtn.style.display = 'none';
    }
    
    // Next post
    const nextPost = allBlogPosts[currentIndex + 1];
    const nextBtn = document.getElementById('next-blog');
    if (nextPost) {
        nextBtn.href = `blog-${nextPost.id}.html`;
    } else {
        nextBtn.style.display = 'none';
    }
}

// Social Share Functions
function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&t=${title}`, '_blank');
}

function shareOnTwitter() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

function shareOnWhatsApp() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title);
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
}