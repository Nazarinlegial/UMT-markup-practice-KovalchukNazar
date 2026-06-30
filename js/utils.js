export function extractErrorMessage(error, fallbackMessage = "Something went wrong. Please try again later.") {
	// Flora's backend reports errors as { status, message }. Older mocks used
	// { error }, so we accept either shape to stay resilient.
	const serverMessage = error.response?.data?.message ?? error.response?.data?.error;
	if (typeof serverMessage === "string" && serverMessage.length > 0) {
		return serverMessage;
	}
	if (error.message) {
		return error.message;
	}
	return fallbackMessage;
}

export function formatPriceUsd(priceValue) {
	if (priceValue === null || priceValue === undefined || priceValue === "") {
		return "—";
	}
	const numericValue = typeof priceValue === "number" ? priceValue : Number.parseFloat(String(priceValue).replace(/[^0-9.,-]/g, "").replace(",", "."));
	if (Number.isNaN(numericValue)) {
		return String(priceValue);
	}
	return `$${numericValue}`;
}

// Resolve an image path against the deployed base URL. Images sit in
// /public/images/, so Vite ships them verbatim (no content hashing) — no
// module-level glob is needed, and the browser only ever pulls the single
// @1x or @2x file that the <img srcset> selects for its DPR.
const BASE = import.meta.env.BASE_URL || "/";

export function resolveImageUrl(rawPath) {
	if (!rawPath || typeof rawPath !== "string") {
		return "";
	}
	if (/^(https?:)?\/\//i.test(rawPath) || rawPath.startsWith("data:")) {
		return rawPath;
	}
	const cleaned = rawPath.replace(/^\.?\/+/, "");
	return BASE + cleaned;
}

// Blur the button after a click so it doesn't hold onto its :focus-visible
// ring. Hover and active animations stay native — we only strip focus.
export function suppressHoverUntilLeave(button) {
	if (!button) return;
	button.blur();
}


