"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui-components/react/checkbox";
import { CheckIcon } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../../cn";
import { shape } from "../../lib/shape";
import { spring } from "../../lib/springs";
import { SelectionBackgrounds, type CheckboxRun, useMergeSplitBlocks } from "../../lib/use-merge-split";
import type { ItemRect } from "../../lib/use-proximity-hover";

interface CheckboxGroupProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
	checkedIndices?: Set<number>;
}

interface ReadonlyCheckboxItemProps extends HTMLAttributes<HTMLDivElement> {
	checked: boolean;
	label: string;
}

interface EditableCheckboxItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onToggle"> {
	checked: boolean;
	children: ReactNode;
	onToggle: (checked: boolean) => void;
}

function CheckboxGroup({ children, checkedIndices = new Set(), className, ...props }: CheckboxGroupProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const itemElements = useRef<HTMLElement[]>([]);
	const groupId = useRef(0);
	const previousGroupMap = useRef(new Map<number, number>());
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [itemRects, setItemRects] = useState<ItemRect[]>([]);
	const hoverSession = useRef(0);
	const checkedSignature = [...checkedIndices].sort((left, right) => left - right).join(",");

	const measureItems = useCallback(() => {
		const container = containerRef.current;
		if (!container) return;
		const containerRect = container.getBoundingClientRect();
		const next = itemElements.current.map((item) => {
			const rect = item.getBoundingClientRect();
			return {
				top: rect.top - containerRect.top + container.scrollTop,
				left: rect.left - containerRect.left + container.scrollLeft,
				width: rect.width,
				height: rect.height,
			};
		});
		setItemRects((current) => {
			if (
				current.length === next.length &&
				current.every(
					(rect, index) =>
						rect.top === next[index].top &&
						rect.left === next[index].left &&
						rect.width === next[index].width &&
						rect.height === next[index].height
				)
			)
				return current;
			return next;
		});
	}, []);

	const synchronizeItems = useCallback(() => {
		itemElements.current = Array.from(
			containerRef.current?.querySelectorAll<HTMLElement>("[data-checkbox-item]") ?? []
		);
		itemElements.current.forEach((item, index) => {
			item.dataset.proximityIndex = String(index);
		});
		requestAnimationFrame(measureItems);
	}, [measureItems]);

	useLayoutEffect(() => {
		synchronizeItems();
		const container = containerRef.current;
		if (!container || typeof MutationObserver === "undefined") return;

		const observer = new MutationObserver(() => synchronizeItems());
		observer.observe(container, { childList: true, subtree: true });
		const resizeObserver = new ResizeObserver(() => measureItems());
		resizeObserver.observe(container);
		return () => {
			observer.disconnect();
			resizeObserver.disconnect();
		};
	}, [children, checkedSignature, synchronizeItems]);

	const runs: CheckboxRun[] = [];
	const nextGroupMap = new Map<number, number>();
	const usedIds = new Set<number>();
	for (const index of [...checkedIndices].sort((a, b) => a - b)) {
		const previous = runs[runs.length - 1];
		if (previous && previous.end + 1 === index) {
			previous.end = index;
			nextGroupMap.set(index, previous.id);
			continue;
		}

		let id: number | null = null;
		for (const [previousIndex, previousId] of previousGroupMap.current) {
			if (usedIds.has(previousId) || previousIndex !== index) continue;
			id = previousId;
			break;
		}
		id ??= ++groupId.current;
		usedIds.add(id);
		runs.push({ start: index, end: index, id });
		nextGroupMap.set(index, id);
	}
	previousGroupMap.current = nextGroupMap;
	const blocks = useMergeSplitBlocks(runs, itemRects, shape.mergedRadius);
	const activeRect = activeIndex === null ? null : itemRects[activeIndex];
	const focusRect = focusedIndex === null ? null : itemRects[focusedIndex];

	return (
		<div
			className={cn("relative flex max-w-full flex-col select-none", className)}
			onBlur={(event) => {
				if (containerRef.current?.contains(event.relatedTarget as Node)) return;
				setFocusedIndex(null);
				setActiveIndex(null);
			}}
			onFocus={(event) => {
				const target = (event.target as HTMLElement).closest<HTMLElement>("[data-proximity-index]");
				const index = Number(target?.dataset.proximityIndex);
				if (!Number.isFinite(index)) return;
				setActiveIndex(index);
				setFocusedIndex((event.target as HTMLElement).matches(":focus-visible") ? index : null);
			}}
			onMouseEnter={() => {
				hoverSession.current += 1;
			}}
			onMouseLeave={() => setActiveIndex(null)}
			onMouseMove={(event) => {
				const container = containerRef.current;
				if (!container) return;
				const rect = container.getBoundingClientRect();
				const cursor = event.clientY - rect.top + container.scrollTop;
				let nearestIndex: number | null = null;
				let nearestDistance = Infinity;
				itemRects.forEach((item, index) => {
					const distance = Math.abs(cursor - (item.top + item.height / 2));
					if (distance < nearestDistance) {
						nearestDistance = distance;
						nearestIndex = index;
					}
				});
				setActiveIndex(nearestIndex);
			}}
			ref={containerRef}
			role="group"
			{...props}>
			<SelectionBackgrounds blocks={blocks} />
			{activeRect && (
				<motion.div
					aria-hidden="true"
					className="pointer-events-none absolute z-0 rounded-lg bg-muted/50"
					key={hoverSession.current}
					animate={{
						top: activeRect.top,
						left: activeRect.left,
						width: activeRect.width,
						height: activeRect.height,
					}}
					initial={false}
					transition={spring.fast}
				/>
			)}
			{focusRect && (
				<motion.div
					aria-hidden="true"
					className="pointer-events-none absolute z-20 rounded-[10px] border border-ring"
					animate={{
						top: focusRect.top - 2,
						left: focusRect.left - 2,
						width: focusRect.width + 4,
						height: focusRect.height + 4,
					}}
					initial={false}
					transition={spring.fast}
				/>
			)}
			{children}
		</div>
	);
}

/**
 * The read-only task row adapted from Fluid Functionalism's checkbox-group.
 * It deliberately has no toggle handler: note viewers must not mutate content.
 */
function ReadonlyCheckboxItem({ checked, label, className, ...props }: ReadonlyCheckboxItemProps) {
	return (
		<div
			aria-checked={checked}
			aria-label={label}
			className={cn(
				"relative z-10 flex min-h-8 items-center gap-2.5 rounded-lg px-3 outline-none transition-colors duration-80",
				className
			)}
			data-checkbox-item
			role="checkbox"
			{...props}>
			<span
				aria-hidden="true"
				className={cn(
					"grid size-[15px] shrink-0 place-items-center rounded-[5px] border-[1.5px]",
					checked ? "border-transparent text-foreground" : "border-border text-transparent"
				)}>
				{checked && <CheckIcon className="size-3.5" strokeWidth={2} />}
			</span>
			<span
				className={cn(
					"min-w-0 text-[13px] leading-5 [text-box:trim-both_cap_alphabetic]",
					checked ? "font-medium text-foreground line-through opacity-60" : "text-foreground"
				)}>
				{label}
			</span>
		</div>
	);
}

function EditableCheckboxItem({
	checked,
	children,
	onToggle,
	className,
	...props
}: EditableCheckboxItemProps) {
	return (
		<div
			aria-checked={checked}
			className={cn(
				"relative z-10 flex min-h-8 items-center gap-2.5 rounded-lg px-3 outline-none transition-colors duration-80",
				className
			)}
			data-checkbox-item
			onClick={(event) => {
				if (!(event.target as HTMLElement).closest('[contenteditable="true"]')) onToggle(!checked);
			}}
			role="checkbox"
			{...props}>
			<CheckboxPrimitive.Root
				aria-hidden="true"
				checked={checked}
				onCheckedChange={onToggle}
				tabIndex={-1}
				className="relative grid size-[15px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-border bg-transparent p-0 text-foreground outline-none transition-colors duration-80 data-checked:border-transparent"
				onClick={(event) => event.stopPropagation()}>
				<CheckboxPrimitive.Indicator>
					<CheckIcon className="size-3.5" strokeWidth={2} />
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Root>
			<div className="min-w-0 flex-1 text-[13px] leading-5 [text-box:trim-both_cap_alphabetic]">
				{children}
			</div>
		</div>
	);
}

export { CheckboxGroup, EditableCheckboxItem, ReadonlyCheckboxItem };
