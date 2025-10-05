// About page scripts

document.addEventListener('DOMContentLoaded', function() {
    loadVisionItems();
    loadStats();
    setupInteractiveElements();
});

function loadVisionItems() {
    const visionData = [
        {
            icon: '📰',
            title: 'Authentic News',
            description: 'Provide authentic news and updates about Udhwa, keeping the community informed about local events, developments, and important announcements.'
        },
        {
            icon: '🏪',
            title: 'Local Businesses',
            description: 'Showcase local businesses and services, helping them reach a wider audience and contributing to the economic growth of our community.'
        },
        {
            icon: '🏛️',
            title: 'Cultural Heritage',
            description: 'Share blogs, stories, and history of Udhwa to preserve our rich cultural heritage and pass it on to future generations.'
        },
        {
            icon: '🌐',
            title: 'Digital Presence',
            description: 'Build a strong digital presence for our community, connecting Udhwa with the wider world while maintaining our unique identity.'
        }
    ];

    renderVisionItems(visionData);
}

function loadStats() {
    const statsData = [
        {
            number: '50+',
            label: 'Local Businesses'
        },
        {
            number: '100+',
            label: 'News Articles'
        },
        {
            number: '25+',
            label: 'Blog Posts'
        },
        {
            number: '1000+',
            label: 'Monthly Visitors'
        }
    ];

    // This would be used if we add a stats section
    // renderStats(statsData);
}

function setupInteractiveElements() {
    // Add interactive effects to vision items
    const visionItems = document.querySelectorAll('.vision-item');
    
    visionItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.15)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
        });
    });

    // Add scroll animations
    setupScrollAnimations();
}

function renderVisionItems(visionData) {
    const container = document.querySelector('.vision-grid');
    
    container.innerHTML = visionData.map(item => `
        <div class="vision-item">
            <span class="vision-icon">${item.icon}</span>
            <h3 class="vision-title">${item.title}</h3>
            <p class="vision-description">${item.description}</p>
        </div>
    `).join('');
}

function renderStats(statsData) {
    const container = document.querySelector('.stats-section');
    
    if (container) {
        container.innerHTML = statsData.map(stat => `
            <div class="stat-item">
                <span class="stat-number">${stat.number}</span>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }
}

function setupScrollAnimations() {
    // Simple scroll animation for elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements that should animate
    const animatedElements = document.querySelectorAll('.vision-item, .about-content, .team-member');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Add some additional interactive features
function initInteractiveFeatures() {
    // Add click effects to CTA button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            // Add ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    }
}

// Add ripple animation CSS
const additionalStyles = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .cta-button {
        position: relative;
        overflow: hidden;
    }
    
    /* Enhanced hover effects */
    .vision-item {
        cursor: pointer;
    }
    
    .about-image {
        cursor: pointer;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize interactive features when DOM is loaded
document.addEventListener('DOMContentLoaded', initInteractiveFeatures);