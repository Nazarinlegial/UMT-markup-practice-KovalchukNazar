import axios from "axios";

const isStaticMode = import.meta.env.VITE_API_MODE === "static";

function resolveApiBaseURL() {
	const raw = import.meta.env.VITE_API_BASE_URL ?? "api";
	if (/^https?:\/\//i.test(raw)) {
		return raw;
	}
	const segment = raw.replace(/^\/+|\/+$/g, "");
	const siteBase = new URL(import.meta.env.BASE_URL, "http://vite.local");
	return new URL(segment, siteBase).pathname;
}

export const apiClient = axios.create({
	baseURL: resolveApiBaseURL(),
	timeout: 15_000,
});

if (isStaticMode) {
	// GitHub Pages cannot run json-server. The Vite build emits one static
	// JSON file per collection (dist/api/<name>.json), so we rewrite outgoing
	// request URLs from `/products` to `/products.json`. Query strings are
	// preserved syntactically but ignored by the static host — if/when we
	// need filtering or pagination on Pages, it has to happen client-side.
	apiClient.interceptors.request.use((config) => {
		if (typeof config.url !== "string" || config.url.length === 0) {
			return config;
		}
		const [pathPart, queryPart] = config.url.split("?", 2);
		if (!pathPart || /\.[a-z0-9]+$/i.test(pathPart)) {
			return config;
		}
		config.url = queryPart ? `${pathPart}.json?${queryPart}` : `${pathPart}.json`;
		return config;
	});
}
