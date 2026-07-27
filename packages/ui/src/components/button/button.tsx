import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "../../cn";

const primaryButtonChrome = "[box-shadow:var(--button-primary-shadow)] hover:opacity-60";

const secondaryButtonChrome =
	"[border-color:var(--button-secondary-border)] [box-shadow:var(--button-secondary-shadow)] hover:opacity-60";

type ButtonProps = React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		loading?: boolean;
	};

const buttonVariants = cva(
	"group/button relative isolate inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-[stroke-width] [&_svg]:duration-100 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='stroke-'])]:stroke-[1.5] group-hover/button:[&_svg:not([class*='stroke-'])]:stroke-2",
	{
		variants: {
			variant: {
				default: cn("bg-primary text-primary-foreground", primaryButtonChrome),
				outline: cn(
					"border bg-background aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30",
					secondaryButtonChrome
				),
				secondary: cn(
					"bg-secondary text-secondary-foreground aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
					secondaryButtonChrome
				),
				ghost:
					"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
				destructive:
					"bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
				link: "text-primary underline-offset-4 hover:underline",
				fullscreen: "",
			},
			size: {
				"default": "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				"xs": "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
				"sm": "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
				"lg": "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				"icon": "size-8",
				"icon-xs":
					"size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	}
);

const spinnerSizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
	"default": "size-4",
	"xs": "size-3",
	"sm": "size-3.5",
	"lg": "size-4",
	"icon": "size-4",
	"icon-xs": "size-3",
	"icon-sm": "size-3.5",
	"icon-lg": "size-4",
};

// Fluid-style infinity-loop spinner. Две keyframe-анимации (spinner-move +
// spinner-dash) в globals.css. currentColor — берёт текстовый цвет кнопки.
function ButtonSpinner({ className }: { className: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
			<path
				d="M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z"
				stroke="currentColor"
				strokeWidth={1.125}
				strokeLinecap="round"
				pathLength={100}
				style={{
					strokeDasharray: "15 85",
					animation: "spinner-move 2s linear infinite, spinner-dash 4s ease-in-out infinite",
				}}
			/>
		</svg>
	);
}

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	loading = false,
	disabled = false,
	children,
	...props
}: ButtonProps) {
	const Comp = asChild ? Slot.Root : "button";
	const isDisabled = disabled || loading;
	const showSpinner = loading && !asChild;

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			aria-busy={loading || undefined}
			disabled={asChild ? undefined : isDisabled}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}>
			{showSpinner ? (
				<span className="relative inline-flex items-center justify-center gap-[inherit]">
					<span className="flex items-center justify-center gap-[inherit] opacity-0" aria-hidden>
						{children}
					</span>
					<span className="absolute inset-0 flex items-center justify-center">
						<ButtonSpinner className={spinnerSizeClass[size ?? "default"]} />
					</span>
				</span>
			) : (
				children
			)}
		</Comp>
	);
}

export { Button, buttonVariants };
