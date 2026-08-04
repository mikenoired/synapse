import { Tabs as TabsPrimitive } from "@base-ui-components/react/tabs";
import type { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
	useRef,
	useState,
	useCallback,
	useEffect,
	useLayoutEffect,
	createContext,
	useContext,
	forwardRef,
	Children,
	cloneElement,
	isValidElement,
	type ComponentPropsWithoutRef,
} from "react";

import { cn } from "../../cn";
import { fontWeights } from "../../lib/font-weights";
import { shape } from "../../lib/shape";
import { spring } from "../../lib/springs";
import { useProximityHover } from "../../lib/use-proximity-hover";

interface TabsValueOrderContextValue {
	valueOrder: string[];
	setValueOrder: (order: string[]) => void;
	selectedValue: string | undefined;
}

const TabsValueOrderContext = createContext<TabsValueOrderContextValue | null>(null);

interface TabsListContextValue {
	registerTab: (index: number, value: string, el: HTMLElement | null) => void;
	hoveredIndex: number | null;
	selectedValue: string | undefined;
	setOptimisticIdx: (index: number) => void;
}

const TabsListContext = createContext<TabsListContextValue | null>(null);

function useTabsList() {
	const ctx = useContext(TabsListContext);
	if (!ctx) throw new Error("TabItem must be used within a TabsList");
	return ctx;
}

interface TabsProps extends Omit<
	ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
	"onValueChange" | "onSelect"
> {
	value?: string;
	onValueChange?: (value: string) => void;
	selectedIndex?: number;
	onSelect?: (index: number) => void;
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
	({ value, onValueChange, selectedIndex, onSelect, defaultValue, children, ...props }, ref) => {
		const [valueOrder, setValueOrder] = useState<string[]>([]);
		const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(defaultValue);

		const updateValueOrder = useCallback((order: string[]) => {
			setValueOrder((current) => {
				if (current.length === order.length && current.every((v, index) => v === order[index])) {
					return current;
				}
				return order;
			});
		}, []);

		// value > lookup по selectedIndex > uncontrolled > первый таб.
		const resolvedValue =
			value ?? (selectedIndex != null ? valueOrder[selectedIndex] : (uncontrolledValue ?? valueOrder[0]));

		const handleValueChange = useCallback(
			(newValue: string) => {
				if (value === undefined && selectedIndex == null) {
					setUncontrolledValue(newValue);
				}
				onValueChange?.(newValue);
				if (onSelect) {
					const idx = valueOrder.indexOf(newValue);
					if (idx !== -1) onSelect(idx);
				}
			},
			[onValueChange, onSelect, valueOrder, value, selectedIndex]
		);

		return (
			<TabsValueOrderContext.Provider
				value={{
					valueOrder,
					setValueOrder: updateValueOrder,
					selectedValue: resolvedValue,
				}}>
				<TabsPrimitive.Root
					ref={ref}
					value={resolvedValue ?? ""}
					onValueChange={handleValueChange}
					{...props}>
					{children}
				</TabsPrimitive.Root>
			</TabsValueOrderContext.Provider>
		);
	}
);

Tabs.displayName = "Tabs";

interface TabsListProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
	orientation?: "horizontal" | "vertical";
}

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
	({ children, className, orientation = "horizontal", ...props }, ref) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const isMouseInside = useRef(false);
		const valueOrderCtx = useContext(TabsValueOrderContext);
		const [optimisticIdx, setOptimisticIdx] = useState<number | null>(null);

		// Порядок значений из children — синхронно
		const values = Children.toArray(children)
			.filter(isValidElement)
			.map((child) => (child.props as { value?: string }).value)
			.filter((v): v is string => typeof v === "string");
		const valueOrderKey = values.join(",");
		const setValueOrder = valueOrderCtx?.setValueOrder;

		useLayoutEffect(() => {
			setValueOrder?.(values);
		}, [setValueOrder, valueOrderKey]);

		const {
			activeIndex: hoveredIndex,
			setActiveIndex: setHoveredIndex,
			itemRects,
			handlers,
			registerItem,
			measureItems,
		} = useProximityHover(containerRef, {
			axis: orientation === "vertical" ? "y" : "x",
		});

		const registerTab = useCallback(
			(index: number, _value: string, el: HTMLElement | null) => {
				registerItem(index, el);
			},
			[registerItem]
		);

		useEffect(() => {
			measureItems();
		}, [measureItems, children]);

		const handleMouseMove = useCallback(
			(e: React.MouseEvent) => {
				isMouseInside.current = true;
				handlers.onMouseMove(e);
			},
			[handlers]
		);

		const handleMouseLeave = useCallback(() => {
			isMouseInside.current = false;
			handlers.onMouseLeave();
		}, [handlers]);

		const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
		const selectedValue = valueOrderCtx?.selectedValue;
		const selectedIdx = selectedValue !== undefined ? values.indexOf(selectedValue) : -1;

		useEffect(() => {
			setOptimisticIdx(selectedIdx >= 0 ? selectedIdx : null);
		}, [selectedIdx]);

		const activeSelectedIdx = optimisticIdx;
		const selectedRect = activeSelectedIdx !== null ? itemRects[activeSelectedIdx] : null;
		const hoverRect = hoveredIndex !== null ? itemRects[hoveredIndex] : null;
		const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
		const isHoveringSelected = hoveredIndex === activeSelectedIdx;
		const isHovering = hoveredIndex !== null && !isHoveringSelected;

		const indexedChildren = Children.map(children, (child, i) => {
			if (isValidElement(child) && typeof child.type !== "string") {
				return cloneElement(child, { _index: i } as Record<string, unknown>);
			}
			return child;
		});

		return (
			<TabsListContext.Provider
				value={{
					registerTab,
					hoveredIndex,
					selectedValue,
					setOptimisticIdx,
				}}>
				<TabsPrimitive.List
					ref={(node) => {
						(containerRef as React.RefObject<HTMLDivElement | null>).current = node;
						if (typeof ref === "function") ref(node);
						else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = node;
					}}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
					onFocus={(e) => {
						const trigger = (e.target as HTMLElement).closest('[role="tab"]');
						if (!trigger) return;
						const indexAttr = trigger.getAttribute("data-proximity-index");
						if (indexAttr != null) {
							const idx = Number(indexAttr);
							setHoveredIndex(idx);
							setFocusedIndex((e.target as HTMLElement).matches(":focus-visible") ? idx : null);
						}
					}}
					onBlur={(e) => {
						if (containerRef.current?.contains(e.relatedTarget as Node)) return;
						setFocusedIndex(null);
						if (isMouseInside.current) return;
						setHoveredIndex(null);
					}}
					className={cn(
						"relative bg-muted p-1 select-none",
						orientation === "vertical"
							? "flex flex-col items-stretch gap-0.5"
							: "inline-flex items-center gap-0.5",
						shape.container,
						className
					)}
					{...props}>
					{selectedRect && (
						<motion.div
							className={cn("pointer-events-none absolute bg-background shadow-sm", shape.bg)}
							initial={false}
							animate={{
								left: selectedRect.left,
								width: selectedRect.width,
								top: selectedRect.top,
								height: selectedRect.height,
								opacity: isHovering ? 0.85 : 1,
							}}
							transition={{
								...spring.moderate,
								opacity: { duration: 0.08 },
							}}
						/>
					)}

					<AnimatePresence>
						{hoverRect && !isHoveringSelected && selectedRect && (
							<motion.div
								className={cn("pointer-events-none absolute bg-foreground/10", shape.bg)}
								initial={{
									left: selectedRect.left,
									width: selectedRect.width,
									top: selectedRect.top,
									height: selectedRect.height,
									opacity: 0,
								}}
								animate={{
									left: hoverRect.left,
									width: hoverRect.width,
									top: hoverRect.top,
									height: hoverRect.height,
									opacity: 0.4,
								}}
								exit={
									!isMouseInside.current && selectedRect
										? {
												left: selectedRect.left,
												width: selectedRect.width,
												top: selectedRect.top,
												height: selectedRect.height,
												opacity: 0,
												transition: {
													...spring.moderate,
													opacity: { duration: 0.06 },
												},
											}
										: { opacity: 0, transition: spring.fast.exit }
								}
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
								className={cn("pointer-events-none absolute z-20 border border-ring", shape.focusRing)}
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

					{indexedChildren}
				</TabsPrimitive.List>
			</TabsListContext.Provider>
		);
	}
);

TabsList.displayName = "TabsList";

interface TabItemProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> {
	value: string;
	icon?: LucideIcon;
	label: string;
	_index?: number;
}

const TabItem = forwardRef<HTMLButtonElement, TabItemProps>(
	({ value, icon: Icon, label, _index = 0, className, onClick, ...props }, ref) => {
		const internalRef = useRef<HTMLButtonElement>(null);
		const { registerTab, hoveredIndex, selectedValue, setOptimisticIdx } = useTabsList();

		useEffect(() => {
			registerTab(_index, value, internalRef.current);
			return () => registerTab(_index, value, null);
		}, [_index, value, registerTab]);

		const isSelected = selectedValue === value;
		const isActive = hoveredIndex === _index || isSelected;

		return (
			<TabsPrimitive.Tab
				onClick={(e) => {
					setOptimisticIdx(_index);
					onClick?.(e);
				}}
				ref={(node) => {
					const button = node as HTMLButtonElement | null;
					(internalRef as React.RefObject<HTMLButtonElement | null>).current = button;
					if (typeof ref === "function") ref(button);
					else if (ref) (ref as React.RefObject<HTMLButtonElement | null>).current = button;
				}}
				value={value}
				data-proximity-index={_index}
				className={cn(
					"relative z-10 flex h-8 cursor-pointer items-center gap-2 border-none bg-transparent px-3 outline-none",
					className
				)}
				{...props}>
				{Icon && (
					<Icon
						size={16}
						strokeWidth={isActive ? 2 : 1.5}
						className={cn(
							"transition-[color,stroke-width] duration-80",
							isActive ? "text-foreground" : "text-muted-foreground"
						)}
					/>
				)}
				<span className="inline-grid text-[13px] whitespace-nowrap">
					<span
						className="invisible col-start-1 row-start-1 [text-box:trim-both_cap_alphabetic]"
						style={{ fontVariationSettings: fontWeights.semibold }}
						aria-hidden="true">
						{label}
					</span>
					<span
						className={cn(
							"col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80 [text-box:trim-both_cap_alphabetic]",
							isActive ? "text-foreground" : "text-muted-foreground"
						)}
						style={{
							fontVariationSettings: isSelected ? fontWeights.semibold : fontWeights.normal,
						}}>
						{label}
					</span>
				</span>
			</TabsPrimitive.Tab>
		);
	}
);

TabItem.displayName = "TabItem";

interface TabPanelProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.Panel> {
	value: string;
}

const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(({ className, ...props }, ref) => {
	return <TabsPrimitive.Panel ref={ref} className={cn("outline-none", className)} {...props} />;
});

TabPanel.displayName = "TabPanel";

export { Tabs, TabsList, TabItem, TabPanel };
export type { TabsProps, TabsListProps, TabItemProps, TabPanelProps };
