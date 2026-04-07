export const modalColors = {
	overlay: "rgba(0, 0, 0, 0.5)",
	overlayBlur: "backdrop-blur-sm",

	surface: "var(--background)",
	surfaceElevated: "var(--background)",
	surfaceHover: "var(--muted)",

	header: "rgba(var(--background-rgb, 255, 255, 255), 0.95)",
	headerBlur: "backdrop-blur",

	footer: "var(--muted)/10",
	footerBlur: "backdrop-blur",

	border: "var(--border)",
	borderSubtle: "rgba(var(--border-rgb, 0, 0, 0), 0.5)",

	text: {
		primary: "var(--foreground)",
		secondary: "var(--muted-foreground)",
		disabled: "var(--muted-foreground)/50",
	},

	actions: {
		primary: "var(--primary)",
		primaryForeground: "var(--primary-foreground)",
		secondary: "var(--secondary)",
		secondaryForeground: "var(--secondary-foreground)",
		destructive: "var(--destructive)",
		destructiveForeground: "var(--destructive-foreground)",
		ghost: "transparent",
		ghostHover: "var(--muted)",
	},
} as const;

export type ModalColors = typeof modalColors;
