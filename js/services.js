// Services page scripts

let allServices = [];
let currentCategory = 'all';
let searchTerm = '';

document.addEventListener('DOMContentLoaded', function() {
    loadServices();
    setupSearch();
});

async function loadServices() {
    try {
        showLoading(true);
        
        const response = await fetch('data/services.json');
        allServices = await response.json();
        
        showLoading(false);
        renderServiceCategories();
        renderServices();
        
    } catch (error) {
        console.error('Error loading services:', error);
        showLoading(false);
        showError('Unable to load services. Please try again later.');
    }
}

function setupSearch() {
    const searchInput = document.getElementById('service-search');
    
    searchInput.addEventListener('input', function() {
        searchTerm = this.value.toLowerCase();
        filterServices();
    });
}

function renderServiceCategories() {
    const container = document.querySelector('.categories-grid');
    
    const categories = [
        {
            name: 'Medical',
            icon: '🏥',
            count: allServices.filter(s => s.category === 'medical').length,
            category: 'medical'
        },
        {
            name: 'Education',
            icon: '📚',
            count: allServices.filter(s => s.category === 'education').length,
            category: 'education'
        },
        {
            name: 'Transport',
            icon: '🚗',
            count: allServices.filter(s => s.category === 'transport').length,
            category: 'transport'
        },
        {
            name: 'Repair',
            icon: '🔧',
            count: allServices.filter(s => s.category === 'repair').length,
            category: 'repair'
        },
        {
            name: 'Professional',
            icon: '💼',
            count: allServices.filter(s => s.category === 'professional').length,
            category: 'professional'
        },
        {
            name: 'Utility',
            icon: '⚡',
            count: allServices.filter(s => s.category === 'utility').length,
            category: 'utility'
        }
    ];
    
    container.innerHTML = categories.map(cat => `
        <a href="#" class="category-card" data-category="${cat.category}" onclick="filterByCategory('${cat.category}')">
            <span class="category-icon">${cat.icon}</span>
            <h3 class="category-title">${cat.name}</h3>
            <div class="category-count">${cat.count} Services</div>
        </a>
    `).join('');
}

function filterByCategory(category) {
    currentCategory = category;
    filterServices();
    
    // Update active state
    document.querySelectorAll('.category-card').forEach(card => {
        card.style.borderColor = '';
    });
    
    const activeCard = document.querySelector(`.category-card[data-category="${category}"]`);
    if (activeCard) {
        activeCard.style.borderColor = 'var(--primary-color)';
    }
}

function filterServices() {
    let filteredServices = allServices;
    
    // Filter by category
    if (currentCategory !== 'all') {
        filteredServices = filteredServices.filter(service => 
            service.category === currentCategory
        );
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredServices = filteredServices.filter(service =>
            service.name.toLowerCase().includes(searchTerm) ||
            service.description.toLowerCase().includes(searchTerm) ||
            service.provider.name.toLowerCase().includes(searchTerm)
        );
    }
    
    renderServices(filteredServices);
}

function renderServices(services = allServices) {
    const container = document.getElementById('services-container');
    
    if (services.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No Services Found</h3>
                <p>No services found matching your criteria. Try a different search or category.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="card service-card">
            <img src="${service.image}" alt="${service.name}" class="card-image" 
                 onerror="this.src='https://images.unsplash.com/photo-1581094794329-c6fe63c7a65a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'">
            <div class="card-content">
                <span class="service-category ${service.category}">${getCategoryLabel(service.category)}</span>
                <h3 class="card-title">${service.name}</h3>
                <p class="card-text">${service.description}</p>
                
                ${service.features && service.features.length > 0 ? `
                    <ul class="service-features">
                        ${service.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                ` : ''}
                
                <div class="service-provider">
                    <div class="provider-avatar">${service.provider.name.charAt(0)}</div>
                    <div class="provider-info">
                        <div class="provider-name">${service.provider.name}</div>
                        ${service.provider.experience ? `<div class="provider-experience">${service.provider.experience}</div>` : ''}
                    </div>
                </div>
                
                <div class="service-actions">
                    ${service.phone ? `
                        <a href="tel:${service.phone}" class="action-btn primary">Call Now</a>
                    ` : ''}
                    <a href="${service.link}" class="action-btn">View Details</a>
                </div>
            </div>
        </div>
    `).join('');
}

function getCategoryLabel(category) {
    const labels = {
        'medical': 'Medical',
        'education': 'Education',
        'transport': 'Transport',
        'repair': 'Repair',
        'professional': 'Professional',
        'utility': 'Utility',
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
    const container = document.getElementById('services-container');
    container.innerHTML = `
        <div class="no-results">
            <h3>Error Loading Content</h3>
            <p>${message}</p>
            <button onclick="loadServices()" style="margin-top: 15px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                Try Again
            </button>
        </div>
    `;
}

function showServiceForm() {
    alert('Service listing feature coming soon! Service providers can contact us to get listed.');
    // In future, this can open a modal or redirect to a form page
}

// Reset filters
function resetFilters() {
    currentCategory = 'all';
    searchTerm = '';
    document.getElementById('service-search').value = '';
    filterServices();
    
    // Reset category card borders
    document.querySelectorAll('.category-card').forEach(card => {
        card.style.borderColor = '';
    });
}