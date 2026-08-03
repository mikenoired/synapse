import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const source = new URL("./src/", import.meta.url).pathname;

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": source,
		},
	},
	build: {
		outDir: "dist",
		sourcemap: true,
		rolldownOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules/@tiptap/")) return "editor-vendor";
					if (id.includes("node_modules/@tanstack/") || id.includes("node_modules/react"))
						return "react-vendor";
				},
			},
		},
	},
});
