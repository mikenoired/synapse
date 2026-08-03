/* eslint-disable no-console -- command-line bundle report */

import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const buildDirectory = join(import.meta.dir, "..", "apps", "web", ".next");

async function filesIn(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const path = join(directory, entry.name);
			return entry.isDirectory() ? filesIn(path) : [path];
		})
	);

	return files.flat();
}

function formatBytes(bytes: number) {
	return `${(bytes / 1024).toFixed(1)} KiB`;
}

try {
	const files = await filesIn(buildDirectory);
	const assets = await Promise.all(
		files
			.filter((file) => file.endsWith(".js") || file.endsWith(".css"))
			.map(async (file) => ({
				file,
				size: (await stat(file)).size,
			}))
	);
	const staticAssets = assets.filter((asset) => asset.file.includes("/.next/static/"));
	const total = staticAssets.reduce((sum, asset) => sum + asset.size, 0);

	console.log("\nFinal bundle size (.next/static):");
	console.log(
		`  JavaScript: ${formatBytes(staticAssets.filter((asset) => asset.file.endsWith(".js")).reduce((sum, asset) => sum + asset.size, 0))}`
	);
	console.log(
		`  CSS:        ${formatBytes(staticAssets.filter((asset) => asset.file.endsWith(".css")).reduce((sum, asset) => sum + asset.size, 0))}`
	);
	console.log(`  Total:      ${formatBytes(total)}`);

	for (const asset of [...staticAssets].sort((a, b) => b.size - a.size).slice(0, 10)) {
		console.log(`  ${formatBytes(asset.size).padStart(10)}  ${relative(buildDirectory, asset.file)}`);
	}
} catch {
	console.error("Bundle output was not found. Run `bun --filter @synapse/web run build` first.");
	process.exit(1);
}
