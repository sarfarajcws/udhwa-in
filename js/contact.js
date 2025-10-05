// Contact page scripts

document.addEventListener('DOMContentLoaded', function() {
    setupContactForm();
});

function setupContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };
        
        // Basic validation
        if (validateForm(formData)) {
            submitContactForm(formData);
        }
    });
}

function validateForm(formData) {
    // Basic validation
    if (!formData.name.trim()) {
        alert('Please enter your name');
        return false;
    }
    
    if (!formData.email.trim()) {
        alert('Please enter your email');
        return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        alert('Please enter a valid email address');
        return false;
    }
    
    if (!formData.subject.trim()) {
        alert('Please enter a subject');
        return false;
    }
    
    if (!formData.message.trim()) {
        alert('Please enter your message');
        return false;
    }
    
    return true;
}

function submitContactForm(formData) {
    // Show loading state
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    // Simulate form submission (in real implementation, this would be an API call)
    setTimeout(() => {
        // Success message
        alert('Thank you for your message! We will get back to you soon.');
        
        // Reset form
        document.getElementById('contactForm').reset();
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Log the form data (in real implementation, this would be sent to server)
        console.log('Contact form submitted:', formData);
        
    }, 1500);
}

// Optional: Add interactive features
function initMap() {
    // This function would initialize Google Maps
    // For now, it's a placeholder for future implementation
    console.log('Map initialization would go here');
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effects to contact items
    const contactItems = document.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(5px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
    
    // Add focus effects to form inputs
    const formInputs = document.querySelectorAll('.form-group input, .form-group textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
});

// Add some CSS for the focused state
const additionalStyles = `
    .form-group.focused label {
        color: var(--primary-color);
    }
    
    .contact-item {
        transition: transform 0.3s ease;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);