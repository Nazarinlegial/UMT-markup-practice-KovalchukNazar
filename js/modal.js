/* ================================ */
/* Modal controller — Order form + Product details */
/* ================================ */

import { apiClient } from "./apiClient.js";
import { showErrorNotification, showSuccessNotification } from "./notifications.js";
import { extractErrorMessage } from "./utils.js";

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
// The bouquet currently open in the product modal — carried into the order so
// it ties the order to that bouquet (plus the quantity chosen there).
let selectedBouquetId = null;
let selectedQuantity = 1;

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

	// Trigger a reflow so the open transition actually plays
	void modalRef.offsetWidth;
	modalRef.classList.add("is-open");

	document.body.classList.add("modal-open");
	document.addEventListener("keydown", onKeyDown);

	// Send focus into the modal, skipping the close button so labels are read first
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

	// Capture which bouquet this modal stands for (stamped on the card at render time).
	selectedBouquetId = card.dataset.bouquetId ? Number(card.dataset.bouquetId) : null;

	productTitleRef.textContent = title;
	productPriceRef.textContent = price;

	// Cards rendered from the API tuck the long description into data-desc-long;
	// the modal prefers it, then falls back to the short card blurb,
	// and finally to the Figma copy used for hardcoded fallback content.
	const longDesc = card.dataset?.descLong;
	const shortDesc = card.querySelector(".product-card-text")?.textContent?.trim() ?? "";
	productTextRef.textContent =
		longDesc ||
		shortDesc ||
		"Each stem is carefully selected to create a bouquet that radiates freshness, elegance, and the gentle charm of spring. Whether you're celebrating a birthday, sending love, or simply brightening someone's day, this arrangement is sure to bring warm smiles and lasting impressions.";

	if (!image) return;

	productImageRef.alt = image.getAttribute("alt") || title;

	// The card markup relies on density descriptors:
	//   e.g. src="…@1x.jpg" srcset="…@2x.jpg 2x"
	//
	// The modal is noticeably wider than the card (mobile 295 vs ~340,
	// tablet 308 vs ~340, desktop 536 vs ~405). With density-only
	// descriptors the browser grabs the @1x at DPR=1 and upscales it on
	// desktop, which is what caused the blur. Switching to
	// a width-descriptor srcset alongside the modal's `sizes` attribute
	// lets the browser reach for the bigger asset whenever the modal needs
	// more pixels than @1x can deliver.
	//
	// The @2x width is computed as exactly 2× @1x.naturalWidth — every
	// bouquet asset in this project ships as a 2:1 retina pair
	// (e.g. 340/680, 405/810). Since the card image is already in the DOM,
	// its naturalWidth is read without an extra network request.
	const src1x = image.getAttribute("src") || "";
	const cardSrcset = image.getAttribute("srcset") || "";
	const m2x = cardSrcset.match(/(\S+)\s+2x/);
	const src2x = m2x ? m2x[1] : "";
	const w1 = image.naturalWidth;

	// Assign srcset BEFORE src so the browser only fires off the candidate it
	// actually needs. Set src first and the browser immediately starts
	// downloading it, then reconsiders once srcset lands and may kick off a
	// second parallel fetch for a better candidate — stranding the
	// initial @1x mid-flight (showing up later as a cancelled request).
	// `sizes` works hand-in-hand with a width-descriptor srcset: it tells the
	// browser how wide the rendered slot is at each breakpoint. We set it here
	// rather than in the markup because the W3C validator flags a lone `sizes`
	// with no srcset, and srcset itself is only built at open-time from the
	// clicked card.
	if (src1x && src2x && w1 > 0) {
		productImageRef.sizes = "(min-width: 1440px) 536px, (min-width: 768px) 308px, 295px";
		productImageRef.srcset = `${src1x} ${w1}w, ${src2x} ${w1 * 2}w`;
		productImageRef.src = src1x;
	} else {
		// Drop back to the original density form when we can't read the
		// natural width (e.g. the card image hasn't loaded yet). A density
		// srcset has no use for `sizes`, so strip it to keep the markup tidy.
		productImageRef.removeAttribute("sizes");
		productImageRef.srcset = cardSrcset;
		productImageRef.src = src1x;
	}
}

/* ===== Product-modal quantity validation ===== */

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
	// Validation only fires on the Buy-now click, so clear any lingering error
	// the moment the user starts editing, whether or not the new value is
	// valid yet. Mirrors how the order-form fields behave.
	quantityRef.addEventListener("input", () => {
		if (quantityRef.classList.contains("is-error")) {
			clearQuantityError();
		}
	});
}

/* ===== Trigger wiring (delegated, so cards rendered later still work) ===== */

document.addEventListener("click", (event) => {
	const productTrigger = event.target.closest("[data-product-trigger]");
	if (productTrigger) {
		fillProductModal(productTrigger);
		// Empty the field so the "1" placeholder shows again,
		// and clear any error left over from a previous open.
		clearQuantityError();
		if (quantityRef) quantityRef.value = "";
		openModal(productModalRef, productTrigger);
		return;
	}

	const openTrigger = event.target.closest("[data-open-modal]");
	if (openTrigger) {
		// Buy now sits inside the product modal, so block the leap to the
		// order modal when quantity is 0/empty/negative — same gate as the
		// order-form submit.
		const isBuyNow = openTrigger.classList.contains("product-modal-buy");
		if (isBuyNow && !isQuantityValid()) {
			const message = quantityRef.value.trim()
				? "Quantity must be greater than 0"
				: "Please enter a quantity";
			markQuantityError(message);
			quantityRef.focus();
			return;
		}
		const targetId = openTrigger.getAttribute("data-open-modal");
		if (isBuyNow) {
			// Carry the chosen quantity into the order (the bouquet id was already
			// captured when the product modal opened).
			selectedQuantity = Number.parseInt(quantityRef?.value, 10) || 1;
		} else if (targetId === "order-modal") {
			// Order opened on its own (not from a bouquet) — no bouquet to tie it to.
			selectedBouquetId = null;
			selectedQuantity = 1;
		}
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

/* ===== Closing interactions ===== */

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

/* ===== Order-form validation and submit ===== */

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
		// Allow digits, spaces, +, -, and parentheses, but demand at least 7 digits.
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
		// Clear the error the moment the user edits the field — typing or
		// pasting is enough to signal they're working on a fix.
		field.addEventListener("input", () => {
			if (field.classList.contains("is-error")) {
				clearFieldError(field);
			}
		});
	});

	let isSubmitting = false;
	const submitButton = orderFormRef.querySelector("button[type='submit']");

	orderFormRef.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (isSubmitting) return;

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
		const payload = {
			name: (data.name || "").toString().trim(),
			phone: (data.phone || "").toString().trim(),
			address: (data.address || "").toString().trim(),
			message: (data.message || "").toString().trim(),
			quantity: selectedQuantity,
			bouquetId: selectedBouquetId,
		};

		// Lock the form while the request is in flight to block double submits.
		isSubmitting = true;
		const defaultLabel = submitButton?.textContent;
		if (submitButton) {
			submitButton.disabled = true;
			submitButton.classList.add("is-loading");
			submitButton.textContent = "Sending...";
		}

		try {
			await apiClient.post("/orders", payload);
			showSuccessNotification(`Thank you, ${payload.name}! We'll call you at ${payload.phone} shortly.`);
			orderFormRef.reset();
			validatable.forEach((field) => clearFieldError(field));
			closeModal();
		} catch (error) {
			showErrorNotification(extractErrorMessage(error, "Could not place your order. Please try again."));
		} finally {
			isSubmitting = false;
			if (submitButton) {
				submitButton.disabled = false;
				submitButton.classList.remove("is-loading");
				submitButton.textContent = defaultLabel;
			}
		}
	});
}
