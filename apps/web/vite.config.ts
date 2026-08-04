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
	},
});
