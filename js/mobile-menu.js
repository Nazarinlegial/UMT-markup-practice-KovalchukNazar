const menuBtnRef = document.querySelector("[data-menu-button]");
const mobileMenuRef = document.querySelector("[data-menu]");

function closeMobileMenu() {
	menuBtnRef.setAttribute("aria-expanded", "false");

	document.body.classList.remove("menu-open");
	menuBtnRef.classList.remove("is-open");

	mobileMenuRef.classList.remove("is-open");
}

menuBtnRef.addEventListener("click", () => {
	window.scrollTo(0, 0);

	const expanded = menuBtnRef.getAttribute("aria-expanded") === "true" || false;
	menuBtnRef.setAttribute("aria-expanded", !expanded);

	document.body.classList.toggle("menu-open");
	menuBtnRef.classList.toggle("is-open");

	mobileMenuRef.classList.toggle("is-open");
});

// Close the menu when any in-page link inside it is clicked (nav links + CTA).
// Delegated on the menu itself so future links picked up automatically.
mobileMenuRef.addEventListener("click", (event) => {
	const link = event.target.closest('a[href^="#"], a[href^="./#"], a[href^="/#"]');
	if (link && mobileMenuRef.contains(link)) {
		closeMobileMenu();
	}
});

window.addEventListener("resize", () => {
	if (window.innerWidth >= 1440) {
		closeMobileMenu();
	}
});
