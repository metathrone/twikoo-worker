import { bindings, defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "twikoo",
		compatibilityDate: "2026-09-01",
		compatibilityFlags: [
			"nodejs_compat",
		],
		entrypoint: "dist/index.js",
		domains: [
			"comment.rushia.eu.org",
		],
		env: {
			DB: bindings.d1({
				name: "twikoo",
				id: "8a81fe04-e662-4d34-aa20-b1f61045fce3",
			}),
		},
	},
});
