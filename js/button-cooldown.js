/* ================================ */
/* Click cooldown for buttons and slider arrows */
/* ================================ */
/* Once clicked, the browser leaves :focus (and often :focus-visible) on the
   element until focus moves elsewhere. On Flora's primary buttons that leaves
   opacity: 0.5 stuck after the click, and the same goes for the slider-nav
   arrows. We tag the freshly-clicked element with .click-cooldown for a brief
   window (≈ 300 ms — enough for the browser to finish the anchor scroll and the
   natural fade), then drop the class. Hover/focus snap back to their normal CSS
   state immediately, so there's no need to move the pointer away and back. */

const COOLDOWN_MS = 125;

function applyCooldown(target) {
	// Wait one microtask so the browser can apply :focus before we react.
	queueMicrotask(() => {
		if (typeof target.blur === "function") {
			target.blur();
		}
		target.classList.add("click-cooldown");

		window.setTimeout(() => {
			target.classList.remove("click-cooldown");
		}, COOLDOWN_MS);
	});
}

document.addEventListener("click", (event) => {
	const target = event.target.closest(".primary-button, .slider-nav-button");
	if (target) {
		applyCooldown(target);
	}
});
