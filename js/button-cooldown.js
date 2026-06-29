/* ================================ */
/* Button cooldown                                                   */
/* ================================ */
/* After a click the browser keeps :focus (and sometimes :focus-visible)
   on the activated element until something else takes focus. For Flora's
   primary buttons that means opacity: 0.5 keeps sticking after the click
   — same for slider-nav arrows. We mark the just-clicked element with
   .click-cooldown for a short window (≈ 300 ms — long enough for the
   browser to scroll on anchor clicks and finish the natural fade) and
   then remove it. Hover/focus return to their normal CSS state right
   after, so the user doesn't have to move the pointer off and back. */

const COOLDOWN_MS = 125;

function applyCooldown(target) {
	// Defer one microtask so the browser has time to apply :focus first.
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
