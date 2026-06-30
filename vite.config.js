import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const isUserOrOrgSite = Boolean(repo?.endsWith(".github.io"));
const base =
	isGitHubActions && repo && !isUserOrOrgSite ? `/${repo}/` : "/";

const jsonServerTarget = "http://127.0.0.1:4001";
// In static mode the catalogue reads the pre-built dist/api/*.json files, so
// proxying `/api/*` to a local json-server would shadow them — that's why the
// proxy is skipped entirely whenever VITE_API_MODE=static.
const isStaticApiMode = process.env.VITE_API_MODE === "static";

function stripApiPrefix(prefix) {
	return (path) =>
		path.startsWith(prefix) ? path.slice(prefix.length) || "/" : path;
}

const previewProxy = {};

if (!isStaticApiMode) {
	previewProxy["/api"] = {
		target: jsonServerTarget,
		changeOrigin: true,
		rewrite: stripApiPrefix("/api"),
	};

	if (base !== "/") {
		const prefixedApi = `${base.replace(/\/$/, "")}/api`;
		previewProxy[prefixedApi] = {
			target: jsonServerTarget,
			changeOrigin: true,
			rewrite: stripApiPrefix(prefixedApi),
		};
	}
}

// Build-time emitter that breaks db.json into one static JSON file per
// collection under dist/api/. It backs the static-API mode that runs GitHub
// Pages until the real backend is ready. Each top-level array in db.json maps
// to a file:
//   db.json => { products: [...], feedbacks: [...] }
//   => dist/api/products.json, dist/api/feedbacks.json
function staticJsonServerEmitter({ source = "db.json", outDir = "api" } = {}) {
	return {
		name: "static-json-server-emitter",
		apply: "build",
		generateBundle() {
			const sourcePath = resolve(process.cwd(), source);
			const raw = readFileSync(sourcePath, "utf8");
			const data = JSON.parse(raw);
			for (const [collectionName, value] of Object.entries(data)) {
				if (!Array.isArray(value)) {
					continue;
				}
				this.emitFile({
					type: "asset",
					fileName: `${outDir}/${collectionName}.json`,
					source: JSON.stringify(value),
				});
			}
		},
	};
}

export default defineConfig({
	base,
	build: {
		// Pin esbuild's CSS target to an old enough browser that it WON'T rewrite
		// `@media (min-resolution: 192dpi)` into the CSS Media Queries Level 4
		// range form `(resolution>=192dpi)`. The jigsaw W3C CSS3 validator rejects
		// the range form, even though every modern browser supports it.
		cssTarget: ["chrome89", "firefox89", "edge89", "safari14"],
	},
	plugins: [
		staticJsonServerEmitter(),
		// Keep images/ in the project root (the uni assignment requires it) yet
		// still ship them into dist/ at build time. In dev Vite serves them as
		// static files on its own.
		viteStaticCopy({
			// src targets the folder itself (not individual files) and dest is the dist
			// root, yielding dist/images/* with no nested folder.
			targets: [{ src: "images", dest: "" }],
		}),
	],
	server: {
		port: 4000,
		proxy: {
			// Forward "/api/*" to the Flora backend verbatim — its routes live under
			// "/api/v1/...". Keeping the prefix keeps the browser same-origin, so
			// there's no CORS in dev.
			"/api": {
				target: "http://localhost:4001",
				changeOrigin: true,
			},
		},
	},
	preview: {
		proxy: previewProxy,
	},
});
