import type { CSSProperties } from "react";

export const TAG_COLOR_PALETTE = [
	"#df5871",
	"#df8041",
	"#c89a27",
	"#86a63a",
	"#3d9d68",
	"#29988d",
	"#3296ae",
	"#4c7fd1",
	"#696bd0",
	"#9163bd",
	"#bd5b9b",
	"#d15e70",
] as const;

export function getTagColor(color?: number | null) {
	if (!color || color < 1) return undefined;
	return TAG_COLOR_PALETTE[color - 1];
}

export function getTagColorStyle(color?: number | null): CSSProperties | undefined {
	const value = getTagColor(color);
	if (!value) return undefined;

	return {
		"--tag-color": value,
		"backgroundColor": `${value}20`,
		"borderColor": `${value}58`,
	} as CSSProperties;
}

export function tagColorToPixi(color?: number | null) {
	const value = getTagColor(color);
	return value ? Number.parseInt(value.slice(1), 16) : undefined;
}
