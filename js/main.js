// Footer current year
document.getElementById("current-year").textContent = new Date().getFullYear();

// Hamburger Menu

const burgerBtn = document.getElementById("burgerBtn");
const menuBackdrop = document.getElementById("menuBackdrop");
const mobileMenu = document.getElementById("mobileMenu");
const mobileMenuClose = document.getElementById("mobileMenuClose");

function toggleMenu() {
  document.body.classList.toggle("menu-open");
  burgerBtn.classList.toggle("open");
}

function closeMenu() {
  document.body.classList.remove("menu-open");
  burgerBtn.classList.remove("open");
}

burgerBtn.addEventListener("click", toggleMenu);
menuBackdrop.addEventListener("click", closeMenu);
mobileMenuClose.addEventListener("click", closeMenu);

document.querySelectorAll("#mobileMenu a").forEach((link) => {
  link.addEventListener("click", () => {
    if (document.body.classList.contains("menu-open")) closeMenu();
  });
});

document.querySelectorAll("#mobileMenu .nav-login-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (document.body.classList.contains("menu-open")) closeMenu();
  });
});

// Format Date
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options)
}