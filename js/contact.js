    // Form submission
    document.getElementById('contactForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const feedback = document.getElementById('form-feedback');
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.disabled = false;
        feedback.classList.remove('hidden');
        this.reset();
        setTimeout(() => feedback.classList.add('hidden'), 5000);
      }, 1500);
    });