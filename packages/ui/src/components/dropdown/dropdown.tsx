"use client";

import { Menu as DropdownMenuPrimitive } from "@base-ui-components/react/menu";
import { motion, AnimatePresence } from "motion/react";
import {
	useRef,
	useState,
	useEffect,
	useCallback,
	useMemo,
	createContext,
	useContext,
	forwardRef,
	cloneElement,
	type ReactNode,
	type ReactElement,
	type HTMLAttributes,
	type ComponentPropsWithoutRef,
} from "react";

import { cn } from "../../cn";
import { shape } from "../../lib/shape";
import { spring, exitFallbackMs } from "../../lib/springs";
import { useProximityHover } from "../../lib/use-proximity-hover";
import {
	DropdownContext,
	useDropdown,
	useDropdownMaybe,
	type DropdownContextValue,
	type MenuItemRenderOptions,
} from "./menu-item";

export { useDropdown, useDropdownMaybe };
export type { DropdownContextValue, MenuItemRenderOptions };

// Поверхность попапа: bg-popover + средняя тень + тонкая рамка (как у
// существующего ContextMenu). В отличие от Fluid, без 8-уровневой surface-системы.
const surfaceClass = "bg-popover shadow-md ring-1 ring-border";

// ---------------------------------------------------------------------------
// Dropdown (inline-панель) — всегда отрисованная панель без trigger/позиционирования.
// role="group" (не menu) — настоящие menu-семантики у попапа DropdownContent ниже.
// ---------------------------------------------------------------------------

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	checkedIndex?: number;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
	({ children, checkedIndex, className, ...props }, ref) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const { activeIndex, setActiveIndex, itemRects, sessionRef, handlers, registerItem, measureItems } =
			useProximityHover(containerRef);

		useEffect(() => {
			measureItems();
		}, [measureItems, children]);

		const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

		const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
		const checkedRect = checkedIndex != null ? itemRects[checkedIndex] : null;
		const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
		const isHoveringOther = activeIndex !== null && activeIndex !== checkedIndex;

		return (
			<DropdownContext.Provider value={{ registerItem, activeIndex, checkedIndex }}>
				<div
					ref={(node) => {
						(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
						if (typeof ref === "function") ref(node);
						else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
					}}
					onMouseEnter={handlers.onMouseEnter}
					onMouseMove={handlers.onMouseMove}
					onMouseLeave={handlers.onMouseLeave}
					onFocus={(e) => {
						const indexAttr = (e.target as HTMLElement)
							.closest("[data-proximity-index]")
							?.getAttribute("data-proximity-index");
						if (indexAttr != null) {
							const idx = Number(indexAttr);
							setActiveIndex(idx);
							setFocusedIndex((e.target as HTMLElement).matches(":focus-visible") ? idx : null);
						}
					}}
					onBlur={(e) => {
						if (containerRef.current?.contains(e.relatedTarget as Node)) return;
						setFocusedIndex(null);
						setActiveIndex(null);
					}}
					onKeyDown={(e) => {
						const items = Array.from(
							containerRef.current?.querySelectorAll('[role="menuitem"], [role="menuitemradio"]') ?? []
						) as HTMLElement[];
						const currentIdx = items.indexOf(e.target as HTMLElement);
						if (currentIdx === -1) return;

						if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) {
							e.preventDefault();
							const next = ["ArrowDown", "ArrowRight"].includes(e.key)
								? (currentIdx + 1) % items.length
								: (currentIdx - 1 + items.length) % items.length;
							items[next].focus();
						} else if (e.key === "Home") {
							e.preventDefault();
							items[0]?.focus();
						} else if (e.key === "End") {
							e.preventDefault();
							items[items.length - 1]?.focus();
						}
					}}
					role="group"
					className={cn(
						`${surfaceClass} relative flex flex-col gap-0.5 w-72 max-w-full p-1 select-none`,
						shape.container,
						className
					)}
					{...props}>
					<AnimatePresence>
						{checkedRect && (
							<motion.div
								className={`absolute ${shape.bg} bg-muted pointer-events-none`}
								initial={false}
								animate={{
									top: checkedRect.top,
									left: checkedRect.left,
									width: checkedRect.width,
									height: checkedRect.height,
									opacity: isHoveringOther ? 0.8 : 1,
								}}
								exit={{ opacity: 0, transition: spring.moderate.exit }}
								transition={{
									...spring.moderate,
									opacity: { duration: 0.08 },
								}}
							/>
						)}
					</AnimatePresence>

					<AnimatePresence>
						{activeRect && (
							<motion.div
								key={sessionRef.current}
								className={`absolute ${shape.bg} bg-foreground/10 pointer-events-none`}
								initial={{
									opacity: 0,
									top: checkedRect?.top ?? activeRect.top,
									left: checkedRect?.left ?? activeRect.left,
									width: checkedRect?.width ?? activeRect.width,
									height: checkedRect?.height ?? activeRect.height,
								}}
								animate={{
									opacity: 1,
									top: activeRect.top,
									left: activeRect.left,
									width: activeRect.width,
									height: activeRect.height,
								}}
								exit={{ opacity: 0, transition: spring.fast.exit }}
								transition={{
									...spring.fast,
									opacity: { duration: 0.08 },
								}}
							/>
						)}
					</AnimatePresence>

					<AnimatePresence>
						{focusRect && (
							<motion.div
								className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-ring`}
								initial={false}
								animate={{
									left: focusRect.left - 2,
									top: focusRect.top - 2,
									width: focusRect.width + 4,
									height: focusRect.height + 4,
								}}
								exit={{ opacity: 0, transition: spring.fast.exit }}
								transition={{
									...spring.fast,
									opacity: { duration: 0.08 },
								}}
							/>
						)}
					</AnimatePresence>

					{children}
				</div>
			</DropdownContext.Provider>
		);
	}
);

Dropdown.displayName = "Dropdown";

// ---------------------------------------------------------------------------
// DropdownMenu (popup root) — на Radix DropdownMenu: trigger, позиционирование,
//dismissal, roving highlight, typeahead, close-on-select. Здесь — proximity-hover
// overlays + spring open/close. Portal lifetime — локальный mounted (deferred unmount).
// ---------------------------------------------------------------------------

interface DropdownMenuContextValue {
	open: boolean;
	disabled: boolean;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
	const ctx = useContext(DropdownMenuContext);
	if (!ctx) throw new Error("DropdownMenu compound components must be inside <DropdownMenu>");
	return ctx;
}

interface DropdownMenuProps {
	children: ReactNode;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
}

function DropdownMenu({
	children,
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	disabled = false,
}: DropdownMenuProps) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen);
	const open = openProp !== undefined ? openProp : internalOpen;

	const handleOpenChange = useCallback(
		(next: boolean) => {
			if (openProp === undefined) setInternalOpen(next);
			onOpenChange?.(next);
		},
		[openProp, onOpenChange]
	);

	const ctx = useMemo(() => ({ open, disabled }), [open, disabled]);

	return (
		<DropdownMenuContext.Provider value={ctx}>
			<DropdownMenuPrimitive.Root open={open} onOpenChange={handleOpenChange} modal={false}>
				{children}
			</DropdownMenuPrimitive.Root>
		</DropdownMenuContext.Provider>
	);
}

DropdownMenu.displayName = "DropdownMenu";

// ---------------------------------------------------------------------------
// DropdownTrigger — Radix Trigger за Base-UI-style `render`-пропом.
// ---------------------------------------------------------------------------

interface DropdownTriggerProps extends Omit<
	ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>,
	"render"
> {
	render?: ReactElement;
}

const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
	({ render, children, disabled, ...props }, ref) => {
		const { disabled: rootDisabled } = useDropdownMenuContext();
		const isDisabled = disabled || rootDisabled;

		if (render) {
			return (
				<DropdownMenuPrimitive.Trigger
					ref={ref}
					render={render as React.ReactElement<Record<string, unknown>>}
					disabled={isDisabled}
					{...props}
				/>
			);
		}
		return (
			<DropdownMenuPrimitive.Trigger ref={ref} disabled={isDisabled} {...props}>
				{children}
			</DropdownMenuPrimitive.Trigger>
		);
	}
);

DropdownTrigger.displayName = "DropdownTrigger";

// ---------------------------------------------------------------------------
// DropdownContent (popup panel)
// ---------------------------------------------------------------------------

type MenuPositionerProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Positioner>;

interface DropdownContentProps {
	children: ReactNode;
	className?: string;
	checkedIndex?: number;
	side?: MenuPositionerProps["side"];
	align?: MenuPositionerProps["align"];
	sideOffset?: number;
}

const DropdownContent = forwardRef<HTMLDivElement, DropdownContentProps>(
	({ className, children, checkedIndex, side = "bottom", align = "start", sideOffset = 6 }, ref) => {
		const { open } = useDropdownMenuContext();
		const containerRef = useRef<HTMLDivElement>(null);

		const { activeIndex, setActiveIndex, itemRects, sessionRef, handlers, registerItem, measureItems } =
			useProximityHover(containerRef);

		const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
		const [mounted, setMounted] = useState(false);

		useEffect(() => {
			if (open) setMounted(true);
		}, [open]);

		useEffect(() => {
			if (open) return;
			const id = setTimeout(() => setMounted(false), exitFallbackMs(spring.fast));
			return () => clearTimeout(id);
		}, [open]);

		useEffect(() => {
			if (!open || !mounted) return;
			let inner: number;
			const outer = requestAnimationFrame(() => {
				inner = requestAnimationFrame(() => {
					measureItems();
				});
			});
			return () => {
				cancelAnimationFrame(outer);
				cancelAnimationFrame(inner);
			};
		}, [open, mounted, measureItems]);

		const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
		const checkedRect = checkedIndex != null ? itemRects[checkedIndex] : null;
		const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
		const isHoveringOther = activeIndex !== null && activeIndex !== checkedIndex;

		const renderMenuItem = useCallback(
			({
				radio,
				value,
				disabled,
				label,
				closeOnClick,
				element,
				children: itemChildren,
			}: MenuItemRenderOptions) => {
				const commonProps = { disabled, label, closeOnClick } as const;
				const item = cloneElement(element, {}, itemChildren);
				return radio ? (
					<DropdownMenuPrimitive.RadioItem
						value={String(value)}
						{...commonProps}
						render={item as React.ReactElement<Record<string, unknown>>}
					/>
				) : (
					<DropdownMenuPrimitive.Item
						{...commonProps}
						render={item as React.ReactElement<Record<string, unknown>>}
					/>
				);
			},
			[]
		);

		const contentCtx = useMemo(
			() => ({
				registerItem,
				activeIndex,
				checkedIndex,
				inMenu: true,
				renderMenuItem,
			}),
			[registerItem, activeIndex, checkedIndex, renderMenuItem]
		);

		if (!mounted) return null;

		return (
			<DropdownMenuPrimitive.Portal keepMounted>
				<DropdownMenuPrimitive.Positioner side={side} align={align} sideOffset={sideOffset}>
					<DropdownMenuPrimitive.Popup>
						<motion.div
							className="z-50 outline-none"
							initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
							animate={open ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -4, scaleY: 0.96 }}
							transition={open ? spring.fast : spring.fast.exit}
							style={{ transformOrigin: "top center" }}
							onAnimationComplete={() => {
								if (!open) setMounted(false);
							}}>
							<DropdownContext.Provider value={contentCtx}>
								<div
									ref={(node: HTMLDivElement | null) => {
										(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
										if (typeof ref === "function") ref(node);
										else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
									}}
									onMouseEnter={() => {
										handlers.onMouseEnter();
										setFocusedIndex(null);
									}}
									onMouseMove={handlers.onMouseMove}
									onMouseLeave={handlers.onMouseLeave}
									onFocus={(e) => {
										const indexAttr = (e.target as HTMLElement)
											.closest("[data-proximity-index]")
											?.getAttribute("data-proximity-index");
										if (indexAttr != null) {
											const idx = Number(indexAttr);
											setActiveIndex(idx);
											setFocusedIndex((e.target as HTMLElement).matches(":focus-visible") ? idx : null);
										}
									}}
									onBlur={(e) => {
										if (containerRef.current?.contains(e.relatedTarget as Node)) return;
										setFocusedIndex(null);
										setActiveIndex(null);
									}}
									className={cn(
										`${surfaceClass} relative flex flex-col gap-0.5 w-72 max-w-full max-h-[min(480px,var(--available-height))] overflow-y-auto p-1 select-none outline-none`,
										shape.container,
										className
									)}>
									<AnimatePresence>
										{checkedRect && (
											<motion.div
												className={`absolute ${shape.bg} bg-muted pointer-events-none`}
												initial={false}
												animate={{
													top: checkedRect.top,
													left: checkedRect.left,
													width: checkedRect.width,
													height: checkedRect.height,
													opacity: isHoveringOther ? 0.8 : 1,
												}}
												exit={{ opacity: 0, transition: spring.moderate.exit }}
												transition={{
													...spring.moderate,
													opacity: { duration: 0.08 },
												}}
											/>
										)}
									</AnimatePresence>

									<AnimatePresence>
										{activeRect && (
											<motion.div
												key={sessionRef.current}
												className={`absolute ${shape.bg} bg-foreground/10 pointer-events-none`}
												initial={{
													opacity: 0,
													top: checkedRect?.top ?? activeRect.top,
													left: checkedRect?.left ?? activeRect.left,
													width: checkedRect?.width ?? activeRect.width,
													height: checkedRect?.height ?? activeRect.height,
												}}
												animate={{
													opacity: 1,
													top: activeRect.top,
													left: activeRect.left,
													width: activeRect.width,
													height: activeRect.height,
												}}
												exit={{ opacity: 0, transition: spring.fast.exit }}
												transition={{
													...spring.fast,
													opacity: { duration: 0.08 },
												}}
											/>
										)}
									</AnimatePresence>

									<AnimatePresence>
										{focusRect && (
											<motion.div
												className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-ring`}
												initial={false}
												animate={{
													left: focusRect.left - 2,
													top: focusRect.top - 2,
													width: focusRect.width + 4,
													height: focusRect.height + 4,
												}}
												exit={{ opacity: 0, transition: spring.fast.exit }}
												transition={{
													...spring.fast,
													opacity: { duration: 0.08 },
												}}
											/>
										)}
									</AnimatePresence>

									<DropdownMenuPrimitive.RadioGroup
										value={checkedIndex != null ? String(checkedIndex) : undefined}
										className="contents">
										{children}
									</DropdownMenuPrimitive.RadioGroup>
								</div>
							</DropdownContext.Provider>
						</motion.div>
					</DropdownMenuPrimitive.Popup>
				</DropdownMenuPrimitive.Positioner>
			</DropdownMenuPrimitive.Portal>
		);
	}
);

DropdownContent.displayName = "DropdownContent";

// ---------------------------------------------------------------------------
// DropdownLabel / DropdownSeparator
// ---------------------------------------------------------------------------

const DropdownLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("px-2 py-1.5 text-[11px] text-muted-foreground", className)} {...props} />
	)
);

DropdownLabel.displayName = "DropdownLabel";

const DropdownSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} role="separator" className={cn("my-1 -mx-1 h-px bg-border/60", className)} {...props} />
	)
);

DropdownSeparator.displayName = "DropdownSeparator";

export { Dropdown, DropdownLabel, DropdownSeparator, DropdownMenu, DropdownTrigger, DropdownContent };
export type { DropdownProps, DropdownMenuProps, DropdownTriggerProps, DropdownContentProps };
