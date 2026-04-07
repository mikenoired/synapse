export const spacing = {
	"xs": "0.25rem", // 4px
	"sm": "0.5rem", // 8px
	"md": "1rem", // 16px
	"lg": "1.5rem", // 24px
	"xl": "2rem", // 32px
	"2xl": "3rem", // 48px
	"3xl": "4rem", // 64px
} as const;

export const modalSpacing = {
	contentPadding: {
		mobile: spacing.md,
		desktop: spacing.lg,
	},
	headerPadding: {
		mobile: spacing.md,
		desktop: spacing.lg,
	},
	footerPadding: {
		mobile: spacing.md,
		desktop: spacing.lg,
	},
	elementGap: "0.75rem", // 12px
	sectionGap: spacing.lg,
	headerHeight: "64px",
	footerHeight: "72px",
	actionBarHeight: "48px",
} as const;

export type Spacing = keyof typeof spacing;
export type ModalSpacing = typeof modalSpacing;
