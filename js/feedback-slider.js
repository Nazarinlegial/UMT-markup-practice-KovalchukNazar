import { apiClient } from "./apiClient.js";
import { showErrorNotification } from "./notifications.js";
import { extractErrorMessage, suppressHoverUntilLeave } from "./utils.js";

const listRef = document.getElementById("feedback-list");
const loaderRef = document.getElementById("feedback-loader");
const container = document.querySelector(".feedback-container");
const prevBtn = document.querySelector("[data-feedback-prev]");
const nextBtn = document.querySelector("[data-feedback-next]");

const mqDesktop = window.matchMedia("(min-width: 1440px)");
const mqTablet = window.matchMedia("(min-width: 768px)");

let allItems = [];
let currentPage = 0;

function getVisibleCount() {
	if (mqDesktop.matches) return 3;
	if (mqTablet.matches) return 2;
	return 1;
}

function getTotalPages() {
	const visible = getVisibleCount();
	if (visible === 0 || allItems.length === 0) return 1;
	return Math.ceil(allItems.length / visible);
}

function buildItemMarkup() {
	return `
		<li class="feedback-item">
			<blockquote class="feedback-quote">
				<p class="feedback-quote-text"></p>
			</blockquote>
			<p class="feedback-author"></p>
		</li>`;
}

function fillItem(li, feedback, isFirst) {
	li.setAttribute("data-feedback-id", String(feedback.id ?? ""));
	const text = feedback.text ?? "";
	// Match the Figma spec: the very first testimonial is wrapped in
	// typographic quotes (U+201C / U+201D); the rest are plain.
	li.querySelector(".feedback-quote-text").textContent = isFirst ? `“${text}”` : text;

	const author = feedback.author ?? "";
	const location = feedback.location ?? "";
	li.querySelector(".feedback-author").textContent = location ? `${author}, ${location}` : author;
}

function updateNavState(totalPages) {
	if (prevBtn) prevBtn.disabled = currentPage <= 0;
	if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
}

function renderPage() {
	if (!listRef) return;

	const visible = getVisibleCount();
	const totalPages = getTotalPages();
	currentPage = Math.max(0, Math.min(currentPage, totalPages - 1));

	const start = currentPage * visible;
	const slice = allItems.slice(start, start + visible);

	listRef.replaceChildren();
	for (const item of slice) {
		listRef.insertAdjacentHTML("beforeend", buildItemMarkup());
		const isFirst = allItems[0]?.id === item.id;
		fillItem(listRef.lastElementChild, item, isFirst);
	}

	updateNavState(totalPages);
}

function setLoading(isLoading) {
	if (loaderRef) loaderRef.hidden = !isLoading;
	if (container) container.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function bindControls() {
	if (prevBtn) {
		prevBtn.addEventListener("click", (event) => {
			if (currentPage > 0) {
				currentPage -= 1;
				renderPage();
			}
			suppressHoverUntilLeave(event.currentTarget);
		});
	}
	if (nextBtn) {
		nextBtn.addEventListener("click", (event) => {
			if (currentPage < getTotalPages() - 1) {
				currentPage += 1;
				renderPage();
			}
			suppressHoverUntilLeave(event.currentTarget);
		});
	}

	const reRender = () => {
		const visible = getVisibleCount();
		const firstVisibleIndex = currentPage * visible;
		currentPage = Math.floor(firstVisibleIndex / visible);
		renderPage();
	};
	mqDesktop.addEventListener("change", reRender);
	mqTablet.addEventListener("change", reRender);
}

async function boot() {
	if (!listRef) {
		setLoading(false);
		return;
	}

	try {
		const response = await apiClient.get("/feedbacks");
		const data = response.data;
		allItems = Array.isArray(data) ? data : (data?.data ?? []);
		currentPage = 0;
		renderPage();
	} catch (error) {
		showErrorNotification(extractErrorMessage(error, "Unable to load testimonials right now."));
	} finally {
		setLoading(false);
	}

	bindControls();
}

boot();
