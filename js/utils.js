export function extractErrorMessage(error, fallbackMessage = "Something went wrong. Please try again later.") {
	const serverMessage = error.response?.data?.error;
	if (typeof serverMessage === "string") {
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

// Resolve an image path against the deployed base URL. Pictures live in
// /public/images/ so Vite copies them as-is (no hashing) — that means we
// don't need any module-level glob and the browser only fetches the
// specific @1x or @2x file the <img srcset> picks for its DPR.
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

// Drop focus after a click so the button doesn't keep its :focus-visible
// outline. Hover/active animations remain native — we only clear focus.
export function suppressHoverUntilLeave(button) {
	if (!button) return;
	button.blur();
}


