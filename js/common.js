// Global scripts for all pages

// Menu toggle functionality
function toggleMenu() {
    document.body.classList.toggle("open");
}

// Close menu when clicking on menu items
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Close menu when clicking on menu items
    const menuItems = document.querySelectorAll('aside a');
    menuItems.forEach(item => {
        item.addEventListener('click', toggleMenu);
    });
    
    // Close menu when pressing Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.body.classList.contains('open')) {
            toggleMenu();
        }
    });
});

// Utility function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Utility function to truncate text
function truncateText(text, maxLength = 150) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}