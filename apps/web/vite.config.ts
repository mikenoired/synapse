import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const source = new URL("./src/", import.meta.url).pathname;

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": source,
			"next/navigation": `${source}shared/router/next-navigation.ts`,
			"next/link": `${source}shared/router/next-link.tsx`,
			"next/image": `${source}shared/router/next-image.tsx`,
			"next/dynamic": `${source}shared/router/next-dynamic.tsx`,
			"next/web-vitals": `${source}shared/router/next-web-vitals.ts`,
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
