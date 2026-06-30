import { apiClient } from "./apiClient.js";
import { showErrorNotification } from "./notifications.js";
import { extractErrorMessage, formatPriceUsd, resolveImageUrl, suppressHoverUntilLeave } from "./utils.js";

const listRef = document.getElementById("bestsellers-list");
const dotsRef = document.getElementById("bestsellers-dots");
const loaderRef = document.getElementById("bestsellers-loader");
const body = document.querySelector(".bestsellers-body");
const prevBtn = document.querySelector("[data-bestsellers-prev]");
const nextBtn = document.querySelector("[data-bestsellers-next]");

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
		<li class="bestsellers-item">
			<article class="product-card" tabindex="0" role="button" data-product-trigger>
				<img loading="lazy" class="bestsellers-card-image" alt="">
				<div class="product-card-content">
					<div class="product-card-header">
						<h3 class="product-card-title"></h3>
						<p class="product-card-text"></p>
					</div>
					<p class="product-card-price"></p>
				</div>
			</article>
		</li>`;
}

function fillItem(li, product) {
	const image = li.querySelector(".bestsellers-card-image");
	// Assign srcset before src so the browser locks onto the correct DPR
	// candidate straight away instead of pulling both @1x and @2x.
	const img2x = resolveImageUrl(product.img2x);
	if (img2x) {
		image.setAttribute("srcset", `${img2x} 2x`);
	}
	image.src = resolveImageUrl(product.img);
	image.alt = product.alt ?? product.title ?? "";

	li.querySelector(".product-card-title").textContent = product.title ?? "";
	li.querySelector(".product-card-text").textContent = product.desc ?? "";
	li.querySelector(".product-card-price").textContent = formatPriceUsd(product.price);

	if (product.descLong) {
		li.querySelector(".product-card").dataset.descLong = product.descLong;
	}
}

function renderDots(totalPages) {
	if (!dotsRef) return;
	dotsRef.replaceChildren();

	// Limit how many dots render — on mobile (visibleCount=1, totalPages=15) they'd
	// overflow the controls row. A sliding window centred on the current page.
	const maxDots = 6;
	const windowSize = Math.min(totalPages, maxDots);
	let start = Math.max(0, currentPage - Math.floor(windowSize / 2));
	const end = Math.min(totalPages, start + windowSize);
	start = Math.max(0, end - windowSize);

	for (let i = start; i < end; i += 1) {
		const li = document.createElement("li");
		const span = document.createElement("span");
		span.className = "bestsellers-dot";
		if (i === currentPage) {
			li.classList.add("is-active");
		}
		li.dataset.page = String(i);
		li.append(span);
		dotsRef.append(li);
	}
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
	for (const product of slice) {
		listRef.insertAdjacentHTML("beforeend", buildItemMarkup());
		fillItem(listRef.lastElementChild, product);
	}

	renderDots(totalPages);
	updateNavState(totalPages);
}

function setLoading(isLoading) {
	if (loaderRef) loaderRef.hidden = !isLoading;
	if (body) body.setAttribute("aria-busy", isLoading ? "true" : "false");
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
	if (dotsRef) {
		dotsRef.addEventListener("click", (event) => {
			const li = event.target.closest("li[data-page]");
			if (!li) return;
			const page = Number.parseInt(li.dataset.page, 10);
			if (Number.isFinite(page) && page !== currentPage) {
				currentPage = page;
				renderPage();
			}
		});
	}

	const reRender = () => {
		// Keep the leading visible card in place when the breakpoint changes.
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
		const response = await apiClient.get("/bestsellers");
		const data = response.data;
		allItems = Array.isArray(data) ? data : (data?.data ?? []);
		currentPage = 0;
		renderPage();
	} catch (error) {
		showErrorNotification(extractErrorMessage(error, "Unable to load top bouquets right now."));
	} finally {
		setLoading(false);
	}

	bindControls();
}

boot();
