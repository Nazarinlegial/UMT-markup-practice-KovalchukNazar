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
	// json-server can't run on GitHub Pages, so the Vite build writes a
	// standalone JSON file per collection into dist/api/<name>.json. Here we
	// redirect outgoing requests from `/products` to `/products.json`. The
	// static host technically keeps the query string but ignores it, so any
	// future filtering or pagination on Pages must be done client-side.
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
