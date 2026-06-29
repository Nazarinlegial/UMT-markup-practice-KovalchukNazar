import { apiClient } from "./apiClient.js";
import { showErrorNotification } from "./notifications.js";
import { extractErrorMessage, formatPriceUsd, resolveImageUrl, suppressHoverUntilLeave } from "./utils.js";

const itemsPerPage = 8;
const showMoreButtonDefaultLabel = "Show More";
const showMoreButtonLoadingLabel = "Loading...";

const bouquetsList = document.getElementById("bouquets-list");
const bouquetsListShell = document.querySelector(".bouquets-list-shell");
const bouquetsLoader = document.getElementById("bouquets-loader");
const showMoreButton = document.querySelector(".bouquets-show-more-button");
const endMessage = document.querySelector(".bouquets-end-message");

// Single source of truth for pagination state. `currentPage` is the last page
// successfully appended to the list; `hasMore` flips to false when the server
// reports we've reached the end (or the static-mode fallback runs out).
const state = {
	currentPage: 0,
	perPage: itemsPerPage,
	hasMore: true,
	// Static-mode fallback caches the full array on the first request and
	// paginates client-side, since GitHub Pages can't honour ?_page= params.
	staticCache: null,
};

function buildBouquetsListItemShellMarkup() {
	return `
		<li class="bouquets-item">
			<article class="product-card" tabindex="0" role="button" data-product-trigger>
				<img loading="lazy" class="bouquets-card-image" alt="">
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

function fillBouquetsListItem(listItem, product) {
	const image = listItem.querySelector(".bouquets-card-image");
	const img2x = resolveImageUrl(product.img2x);
	if (img2x) {
		image.setAttribute("srcset", `${img2x} 2x`);
	}
	image.src = resolveImageUrl(product.img);
	image.alt = product.alt ?? product.title ?? "";

	listItem.querySelector(".product-card-title").textContent = product.title ?? "";
	listItem.querySelector(".product-card-text").textContent = product.desc ?? "";
	listItem.querySelector(".product-card-price").textContent = formatPriceUsd(product.price);

	if (product.descLong) {
		listItem.querySelector(".product-card").dataset.descLong = product.descLong;
	}
}

function setShowMoreButtonLoading(isLoading) {
	if (!showMoreButton) return;
	showMoreButton.disabled = isLoading;
	showMoreButton.classList.toggle("is-loading", isLoading);
	showMoreButton.textContent = isLoading ? showMoreButtonLoadingLabel : showMoreButtonDefaultLabel;
}

function setBouquetsInitialLoading(isLoading) {
	if (bouquetsLoader) bouquetsLoader.hidden = !isLoading;
	if (bouquetsListShell) bouquetsListShell.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function updateEndState() {
	if (showMoreButton) showMoreButton.hidden = !state.hasMore;
	if (endMessage) endMessage.hidden = state.hasMore || state.currentPage === 0;
}

function appendChunk(items) {
	if (!items.length) return;
	const beforeCount = bouquetsList.children.length;
	const chunkMarkup = items.map(() => buildBouquetsListItemShellMarkup()).join("");
	bouquetsList.insertAdjacentHTML("beforeend", chunkMarkup);
	const listItems = bouquetsList.querySelectorAll(":scope > .bouquets-item");
	for (let i = 0; i < items.length; i += 1) {
		fillBouquetsListItem(listItems[beforeCount + i], items[i]);
	}
}

// Fetch one page. Tries server-side pagination first (json-server v1 returns
// { items, next, ... }); falls back to caching the full array and slicing
// locally when the host ignored the query (static GitHub Pages deployment).
async function fetchPage(page) {
	if (state.staticCache) {
		const start = (page - 1) * state.perPage;
		const slice = state.staticCache.slice(start, start + state.perPage);
		state.hasMore = start + state.perPage < state.staticCache.length;
		return slice;
	}

	const response = await apiClient.get("/products", {
		params: { _page: page, _per_page: state.perPage },
	});
	const data = response.data;

	// json-server v1 paginated shape:
	//   { first, prev, next, last, pages, items: <total count>, data: [...] }
	// `items` is the total record count, the page slice itself sits in `data`.
	if (data && Array.isArray(data.data)) {
		state.hasMore = data.next != null;
		return data.data;
	}

	// Static host returned the full array — switch to client-side mode for
	// the rest of the session and slice from the cache.
	if (Array.isArray(data)) {
		state.staticCache = data;
		const start = (page - 1) * state.perPage;
		const slice = data.slice(start, start + state.perPage);
		state.hasMore = start + state.perPage < data.length;
		return slice;
	}

	// Unknown shape — assume no more items rather than crash.
	state.hasMore = false;
	return [];
}

async function loadNextPage() {
	const targetPage = state.currentPage + 1;
	const items = await fetchPage(targetPage);
	if (items.length > 0) {
		appendChunk(items);
		state.currentPage = targetPage;
	} else {
		state.hasMore = false;
	}
}

async function loadInitial() {
	if (!bouquetsList) return;

	setBouquetsInitialLoading(true);
	bouquetsList.replaceChildren();
	state.currentPage = 0;
	state.hasMore = true;
	state.staticCache = null;
	if (showMoreButton) showMoreButton.hidden = true;
	if (endMessage) endMessage.hidden = true;

	try {
		await loadNextPage();
	} catch (error) {
		showErrorNotification(extractErrorMessage(error, "Unable to load bouquets right now."));
	} finally {
		setBouquetsInitialLoading(false);
		updateEndState();
	}
}

async function handleShowMoreClick() {
	if (!state.hasMore) return;
	setShowMoreButtonLoading(true);
	try {
		await loadNextPage();
	} catch (error) {
		showErrorNotification(extractErrorMessage(error, "Unable to load more bouquets right now."));
	} finally {
		setShowMoreButtonLoading(false);
		updateEndState();
		suppressHoverUntilLeave(showMoreButton);
	}
}

function initBouquetsFromApi() {
	if (!bouquetsList || !showMoreButton) return;
	showMoreButton.addEventListener("click", handleShowMoreClick);
	loadInitial();
}

initBouquetsFromApi();
