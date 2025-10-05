// Individual News Post Scripts - UPDATED VERSION

let currentPostId = null;
let allNewsPosts = [];

function showError(message) {
    const content = document.getElementById('post-content');
    content.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #666;">
            <h3 style="color: #000; margin-bottom: 15px;">Error</h3>
            <p>${message}</p>
            <a href="../news.html" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #000; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Back to News</a>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - starting news load');
    currentPostId = getPostIdFromUrl();
    console.log('Current post ID:', currentPostId);
    loadNewsPost();
});

function getPostIdFromUrl() {
    try {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        const match = filename.match(/news-(\d+)\.html/);
        return match ? parseInt(match[1]) : 1;
    } catch (error) {
        return 1;
    }
}

async function loadNewsPost() {
    try {
        console.log('Loading news posts from JSON...');
        
        // ✅ CORRECT PATH - news folder ke andar se
        const response = await fetch('../data/news/news-posts.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('Raw JSON data:', text);
        
        allNewsPosts = JSON.parse(text);
        console.log('Successfully loaded news posts:', allNewsPosts);
        
        const currentPost = allNewsPosts.find(post => post.id === currentPostId);
        console.log('Found current post:', currentPost);
        
        if (currentPost) {
            console.log('Rendering post...');
            renderNewsPost(currentPost);
        } else {
            showError(`Post with ID ${currentPostId} not found in JSON`);
        }
        
    } catch (error) {
        console.error('Error in loadNewsPost:', error);
        showError('Failed to load news: ' + error.message);
    }
}

function renderNewsPost(post) {
    try {
        console.log('Rendering post:', post.title);
        
        // Basic rendering
        document.title = `${post.title} - udhwa.in`;
        
        // ✅ SAFE ELEMENT SELECTION
        const titleElement = document.getElementById('post-title');
        const dateElement = document.getElementById('post-date');
        const authorElement = document.getElementById('post-author');
        const imageElement = document.getElementById('post-image');
        const contentElement = document.getElementById('post-content');
        
        if (titleElement) titleElement.textContent = post.title;
        if (dateElement) dateElement.textContent = formatDate(post.date);
        if (authorElement) authorElement.textContent = `By ${post.author}`;
        if (imageElement) {
            imageElement.src = post.image;
            imageElement.alt = post.title;
        }
        if (contentElement) {
            contentElement.innerHTML = formatNewsContent(post.content);
        }
        
        // ✅ AUTHOR SECTION FIX
        const authorNameElement = document.getElementById('author-name');
        const authorInitialsElement = document.getElementById('author-initials');
        const authorDescriptionElement = document.getElementById('author-description');
        
        if (authorNameElement) authorNameElement.textContent = post.author;
        if (authorInitialsElement) authorInitialsElement.textContent = post.author.charAt(0);
        if (authorDescriptionElement) {
            authorDescriptionElement.textContent = post.authorBio || `News reporter and content writer from Udhwa`;
        }
        
        console.log('Post rendered successfully');
        
    } catch (error) {
        console.error('Error in renderNewsPost:', error);
        showError('Error displaying content: ' + error.message);
    }
}

function formatNewsContent(content) {
    if (!content) return '<p>Content not available.</p>';
    
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

// Utility functions
function formatDate(dateString) {
    try {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (error) {
        return dateString;
    }
}