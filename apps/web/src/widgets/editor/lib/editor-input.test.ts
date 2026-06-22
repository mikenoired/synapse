import { describe, expect, test } from "bun:test";

import { filterSlashCommands, looksLikeMarkdown } from "./editor-input";

describe("editor input", () => {
	test("detects supported Markdown without intercepting plain text", () => {
		for (const markdown of [
			"## Заголовок",
			"- пункт",
			"> цитата",
			"```ts\ncode\n```",
			"**жирный**",
			"[ссылка](https://example.com)",
		]) {
			expect(looksLikeMarkdown(markdown)).toBe(true);
		}
		expect(looksLikeMarkdown("Обычный текст https://example.com")).toBe(false);
	});

	test("filters slash commands by Russian labels and English aliases", () => {
		const commands = [
			{ aliases: ["heading", "h2"], label: "Заголовок 2" },
			{ aliases: ["image", "photo"], label: "Изображение" },
		];

		expect(filterSlashCommands(commands, "изобр")).toEqual([commands[1]]);
		expect(filterSlashCommands(commands, "heading")).toEqual([commands[0]]);
	});
});
