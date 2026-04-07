export const modalTypography = {
	title: {
		mobile: "text-xl font-bold leading-tight", // 20px
		desktop: "text-2xl font-bold leading-tight", // 24px
	},
	subtitle: "text-base font-semibold leading-tight", // 16px
	body: "text-sm leading-relaxed", // 14px
	caption: "text-xs text-muted-foreground leading-normal", // 12px
	meta: "text-xs text-muted-foreground leading-none", // 12px
	label: "text-sm font-medium leading-none", // 14px
} as const;

export type ModalTypography = typeof modalTypography;
