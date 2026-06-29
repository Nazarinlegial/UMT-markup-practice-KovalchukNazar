/* ================================ */
/* Modal manager — Order + Product Details */
/* ================================ */

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled]):not([type='hidden'])",
	"textarea:not([disabled])",
	"select:not([disabled])",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

const modalRefs = document.querySelectorAll("[data-modal]");

const productModalRef = document.getElementById("product-modal");
const productImageRef = document.getElementById("product-modal-image");
const productTitleRef = document.getElementById("product-modal-title");
const productPriceRef = document.getElementById("product-modal-price");
const productTextRef = document.getElementById("product-modal-text");

const orderModalRef = document.getElementById("order-modal");
const orderFormRef = document.getElementById("order-form");

let lastFocusedElement = null;
let activeModal = null;

function getFocusable(modalRef) {
	return Array.from(modalRef.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
		(el) => !el.hasAttribute("hidden") && el.offsetParent !== null
	);
}

function trapFocus(event) {
	if (!activeModal || event.key !== "Tab") return;

	const focusable = getFocusable(activeModal);
	if (focusable.length === 0) return;

	const first = focusable[0];
	const last = focusable[focusable.length - 1];

	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault();
		last.focus();
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault();
		first.focus();
	}
}

function onKeyDown(event) {
	if (event.key === "Escape") {
		closeModal();
		return;
	}
	trapFocus(event);
}

function openModal(modalRef, trigger) {
	if (!modalRef) return;

	if (activeModal && activeModal !== modalRef) {
		closeModal({ keepBodyLock: true });
	}

	if (trigger) {
		lastFocusedElement = trigger;
	} else if (!lastFocusedElement) {
		lastFocusedElement = document.activeElement;
	}

	activeModal = modalRef;
	modalRef.removeAttribute("hidden");

	// Force reflow so the transition runs
	void modalRef.offsetWidth;
	modalRef.classList.add("is-open");

	document.body.classList.add("modal-open");
	document.addEventListener("keydown", onKeyDown);

	// Move focus inside the modal (skip close button so labels read first)
	const focusable = getFocusable(modalRef);
	const target = focusable.find((el) => !el.matches("[data-modal-close]")) || focusable[0];
	if (target) {
		target.focus({ preventScroll: true });
	}
}

function closeModal(options = {}) {
	if (!activeModal) return;

	const closing = activeModal;
	closing.classList.remove("is-open");
	closing.setAttribute("hidden", "");

	activeModal = null;

	if (!options.keepBodyLock) {
		document.body.classList.remove("modal-open");
		document.removeEventListener("keydown", onKeyDown);

		if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
			lastFocusedElement.focus({ preventScroll: true });
		}
		lastFocusedElement = null;
	}
}

function fillProductModal(card) {
	const title = card.querySelector(".product-card-title")?.textContent?.trim() ?? "";
	const price = card.querySelector(".product-card-price")?.textContent?.trim() ?? "";
	const image = card.querySelector("img");

	productTitleRef.textContent = title;
	productPriceRef.textContent = price;

	// API-rendered cards stash the long description in data-desc-long; the
	// modal uses that when available, falls back to the short card blurb,
	// and lastly to the Figma copy for hardcoded fallback content.
	const longDesc = card.dataset?.descLong;
	const shortDesc = card.querySelector(".product-card-text")?.textContent?.trim() ?? "";
	productTextRef.textContent =
		longDesc ||
		shortDesc ||
		"Each stem is carefully selected to create a bouquet that radiates freshness, elegance, and the gentle charm of spring. Whether you're celebrating a birthday, sending love, or simply brightening someone's day, this arrangement is sure to bring warm smiles and lasting impressions.";

	if (!image) return;

	productImageRef.alt = image.getAttribute("alt") || title;

	// The card markup uses density descriptors:
	//   src="…@1x.jpg" srcset="…@2x.jpg 2x"
	//
	// The modal renders much wider than the card (mobile 295 vs ~340 card,
	// tablet 308 vs ~340 card, desktop 536 vs ~405 card). With density-only
	// descriptors the browser picks the @1x at DPR=1 and upscales it on
	// desktop — that's the source of the blur the user reported. Convert to
	// a width-descriptor srcset paired with the modal's `sizes` attribute
	// so the browser can pick the larger asset whenever the modal needs
	// more pixels than @1x supplies.
	//
	// We compute the @2x width as exactly 2× @1x.naturalWidth — every
	// bouquet asset in this project is shipped as a 2:1 retina pair
	// (e.g. 340/680, 405/810). The card image is already in the DOM, so
	// its naturalWidth is available without an extra network probe.
	const src1x = image.getAttribute("src") || "";
	const cardSrcset = image.getAttribute("srcset") || "";
	const m2x = cardSrcset.match(/(\S+)\s+2x/);
	const src2x = m2x ? m2x[1] : "";
	const w1 = image.naturalWidth;

	// Set srcset BEFORE src so the browser only kicks off the candidate it
	// actually needs. If we set src first, the browser immediately starts
	// fetching it, then re-evaluates once srcset arrives and may start a
	// second parallel fetch for a better-fitting candidate — leaving the
	// initial @1x in flight (and visible as a canceled request later).
	if (src1x && src2x && w1 > 0) {
		productImageRef.srcset = `${src1x} ${w1}w, ${src2x} ${w1 * 2}w`;
		productImageRef.src = src1x;
	} else {
		// Fall back to the original density form if we couldn't read the
		// natural width (e.g. card image hasn't loaded yet).
		productImageRef.srcset = cardSrcset;
		productImageRef.src = src1x;
	}
}

/* ===== Quantity field validation (product modal) ===== */

const quantityRef = document.getElementById("product-modal-quantity");
const quantityErrorRef = document.getElementById("product-modal-quantity-error");

function isQuantityValid() {
	if (!quantityRef) return true;
	const value = Number.parseInt(quantityRef.value, 10);
	return Number.isFinite(value) && value > 0;
}

function markQuantityError(message) {
	if (!quantityRef) return;
	quantityRef.classList.add("is-error");
	if (quantityErrorRef) {
		quantityErrorRef.textContent = message;
		quantityErrorRef.hidden = false;
	}
}

function clearQuantityError() {
	if (!quantityRef) return;
	quantityRef.classList.remove("is-error");
	if (quantityErrorRef) {
		quantityErrorRef.hidden = true;
	}
}

if (quantityRef) {
	// Validation runs only on Buy now click — drop a lingering error as soon
	// as the user starts editing, regardless of whether the new value is yet
	// valid. Same pattern as the order form fields.
	quantityRef.addEventListener("input", () => {
		if (quantityRef.classList.contains("is-error")) {
			clearQuantityError();
		}
	});
}

/* ===== Wire up triggers (delegated so dynamically-rendered cards work) ===== */

document.addEventListener("click", (event) => {
	const productTrigger = event.target.closest("[data-product-trigger]");
	if (productTrigger) {
		fillProductModal(productTrigger);
		// Reset the field to empty so the "1" placeholder is visible again,
		// and drop any stale error from a previous open.
		clearQuantityError();
		if (quantityRef) quantityRef.value = "";
		openModal(productModalRef, productTrigger);
		return;
	}

	const openTrigger = event.target.closest("[data-open-modal]");
	if (openTrigger) {
		// Buy now lives inside the product modal — block the jump to the
		// order modal if quantity is 0/empty/negative, just like the order
		// form's submit gate.
		if (openTrigger.classList.contains("product-modal-buy") && !isQuantityValid()) {
			const message = quantityRef.value.trim()
				? "Quantity must be greater than 0"
				: "Please enter a quantity";
			markQuantityError(message);
			quantityRef.focus();
			return;
		}
		const targetId = openTrigger.getAttribute("data-open-modal");
		const targetRef = document.getElementById(targetId);
		openModal(targetRef, openTrigger);
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key !== "Enter" && event.key !== " ") return;
	const productTrigger = event.target.closest?.("[data-product-trigger]");
	if (!productTrigger || event.target !== productTrigger) return;
	event.preventDefault();
	fillProductModal(productTrigger);
	openModal(productModalRef, productTrigger);
});

/* ===== Close interactions ===== */

modalRefs.forEach((modalRef) => {
	modalRef.addEventListener("click", (event) => {
		if (event.target === modalRef) {
			closeModal();
		}
	});

	modalRef.querySelectorAll("[data-modal-close]").forEach((btn) => {
		btn.addEventListener("click", () => {
			closeModal();
		});
	});
});

/* ===== Order form validation + submit ===== */

function getFieldError(field) {
	return document.getElementById(`${field.id}-error`);
}

function setFieldError(field, message) {
	field.classList.add("is-error");
	const errorEl = getFieldError(field);
	if (errorEl) {
		errorEl.textContent = message;
		errorEl.hidden = false;
	}
}

function clearFieldError(field) {
	field.classList.remove("is-error");
	const errorEl = getFieldError(field);
	if (errorEl) {
		errorEl.hidden = true;
	}
}

function validateField(field) {
	const value = field.value.trim();

	if (field.required && !value) {
		setFieldError(field, "This field is required");
		return false;
	}

	if (field.type === "tel" && value) {
		// Accept digits, spaces, +, -, parentheses; require at least 7 digits.
		const digits = value.replace(/\D/g, "");
		if (digits.length < 7) {
			setFieldError(field, "Please enter a valid phone number");
			return false;
		}
	}

	clearFieldError(field);
	return true;
}

if (orderFormRef) {
	const validatable = orderFormRef.querySelectorAll(".modal-field-input, .modal-field-textarea");

	validatable.forEach((field) => {
		// Clear the error as soon as the user edits the field — typing or
		// pasting is enough of a signal that they're trying to fix it.
		field.addEventListener("input", () => {
			if (field.classList.contains("is-error")) {
				clearFieldError(field);
			}
		});
	});

	orderFormRef.addEventListener("submit", (event) => {
		event.preventDefault();

		let firstInvalid = null;
		validatable.forEach((field) => {
			const ok = validateField(field);
			if (!ok && !firstInvalid) {
				firstInvalid = field;
			}
		});

		if (firstInvalid) {
			firstInvalid.focus();
			return;
		}

		const formData = new FormData(orderFormRef);
		const data = Object.fromEntries(formData.entries());
		const name = (data.name || "").toString().trim();
		const phone = (data.phone || "").toString().trim();

		alert(`Thank you, ${name}! We'll call you at ${phone} shortly.`);

		orderFormRef.reset();
		validatable.forEach((field) => clearFieldError(field));
		closeModal();
	});
}
