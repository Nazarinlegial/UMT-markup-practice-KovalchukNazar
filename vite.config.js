import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { viteStaticCopy } from "vite-plugin-static-copy";

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const isUserOrOrgSite = Boolean(repo?.endsWith(".github.io"));
const base =
	isGitHubActions && repo && !isUserOrOrgSite ? `/${repo}/` : "/";

const jsonServerTarget = "http://127.0.0.1:3001";
// In static mode the catalogue reads pre-built dist/api/*.json files. Proxying
// `/api/*` to a local json-server would shadow those static files, so we skip
// the proxy entirely whenever VITE_API_MODE=static.
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

// Build-time emitter that splits db.json into per-collection static JSON files
// under dist/api/. Used by the static-API mode that powers GitHub Pages until
// the real backend exists. Each top-level array in db.json becomes one file:
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
		// Pin esbuild's CSS target to a browser old enough that it WON'T rewrite
		// `@media (min-resolution: 192dpi)` into the CSS Media Queries Level 4
		// range syntax `(resolution>=192dpi)`. The jigsaw W3C CSS3 validator
		// rejects the range form, even though every modern browser supports it.
		cssTarget: ["chrome89", "firefox89", "edge89", "safari14"],
	},
	plugins: [
		staticJsonServerEmitter(),
		// Keep images/ in the project root (uni assignment requires it) but
		// still ship them into dist/ on build. In dev Vite serves them as
		// static files automatically.
		viteStaticCopy({
			// src points at the folder itself (not files) and dest is the
			// dist-root — that gives dist/images/* without a nested folder.
			targets: [{ src: "images", dest: "" }],
		}),
	],
	server: {
		port: 4000,
		proxy: {
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
	preview: {
		proxy: previewProxy,
	},
});
