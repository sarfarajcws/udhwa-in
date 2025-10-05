// Businesses page scripts

let allBusinesses = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', function() {
    loadBusinesses();
    setupCategoryFilters();
});

async function loadBusinesses() {
    try {
        showLoading(true);
        
        const response = await fetch('data/listings.json');
        allBusinesses = await response.json();
        
        showLoading(false);
        renderBusinesses();
        
    } catch (error) {
        console.error('Error loading businesses:', error);
        showLoading(false);
        showError('Unable to load listings. Please try again later.');
    }
}

function setupCategoryFilters() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current category and filter
            currentCategory = this.dataset.category;
            filterBusinesses();
        });
    });
}

function filterBusinesses() {
    let filteredBusinesses;
    
    if (currentCategory === 'all') {
        filteredBusinesses = allBusinesses;
    } else {
        filteredBusinesses = allBusinesses.filter(business => 
            business.category === currentCategory
        );
    }
    
    renderBusinesses(filteredBusinesses);
}

function renderBusinesses(businesses = allBusinesses) {
    const container = document.getElementById('businesses-container');
    
    if (businesses.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No Listings Found</h3>
                <p>No Listings found in the "${currentCategory}" category.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = businesses.map(business => `
        <div class="card business-card">
            <div class="business-category ${business.category}">
                ${getCategoryLabel(business.category)}
            </div>
            <img src="${business.image}" alt="${business.name}" class="card-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1563013544-824ae1b704d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'">
            <div class="card-content">
                <h3 class="business-name">${business.name}</h3>
                ${business.owner ? `<div class="business-owner">By ${business.owner}</div>` : ''}
                <p class="card-text">${business.description}</p>
                
                ${business.address ? `
                    <div class="contact-info">
                        <span class="contact-icon">📍</span>
                        <span>${business.address}</span>
                    </div>
                ` : ''}
                
                ${business.phone ? `
                    <div class="contact-info">
                        <span class="contact-icon">📞</span>
                        <span>${business.phone}</span>
                    </div>
                ` : ''}
                
                ${business.hours ? `
                    <div class="business-hours">
                        <div class="hours-title">Opening Hours</div>
                        <div class="hours-time">${business.hours}</div>
                    </div>
                ` : ''}
                
                <div class="business-actions">
                    ${business.phone ? `
                        <a href="tel:${business.phone}" class="action-btn primary">Call Now</a>
                    ` : ''}
                    ${business.directions ? `
                        <a href="${business.directions}" target="_blank" class="action-btn">Get Directions</a>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function getCategoryLabel(category) {
    const labels = {
        'restaurant': 'Restaurant',
        'shop': 'Shop',
        'service': 'Service',
        'medical': 'Medical',
        'other': 'Other'
    };
    return labels[category] || category;
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
    const container = document.getElementById('businesses-container');
    container.innerHTML = `
        <div class="no-results">
            <h3>Error Loading Content</h3>
            <p>${message}</p>
            <button onclick="loadBusinesses()" style="margin-top: 15px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                Try Again
            </button>
        </div>
    `;
}

function showAddBusinessForm() {
    alert('Business listing feature coming soon! Business owners can contact us to get listed.');
    // In future, this can open a modal or redirect to a form page
}