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

// Any in-page link clicked inside the menu (nav items + the CTA) closes it.
// We delegate on the menu container so links added later just work.
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
