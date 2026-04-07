"use client";

import { cn } from "@synapse/ui/cn";

interface KeyboardHintProps {
	keys: string[];
	label?: string;
	className?: string;
}

export function KeyboardHint({ keys, label, className }: KeyboardHintProps) {
	return (
		<div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
			<div className="flex items-center gap-1">
				{keys.map((key, index) => (
					<kbd
						key={index}
						className="px-2 py-1 bg-muted border border-border rounded text-xs font-mono shadow-sm">
						{key}
					</kbd>
				))}
			</div>
			{label && <span>{label}</span>}
		</div>
	);
}

interface KeyboardHintsGroupProps {
	hints: Array<{ keys: string[]; label: string }>;
	className?: string;
}

export function KeyboardHintsGroup({ hints, className }: KeyboardHintsGroupProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{hints.map((hint, index) => (
				<KeyboardHint key={index} keys={hint.keys} label={hint.label} />
			))}
		</div>
	);
}

// Предустановленные подсказки для модалок
export const modalKeyboardHints = {
	viewer: [
		{ keys: ["ESC"], label: "Закрыть" },
		{ keys: ["⌘", "E"], label: "Редактировать" },
		{ keys: ["Delete"], label: "Удалить" },
	],
	gallery: [
		{ keys: ["←"], label: "Предыдущее" },
		{ keys: ["→"], label: "Следующее" },
		{ keys: ["ESC"], label: "Закрыть" },
	],
	audio: [
		{ keys: ["Space"], label: "Play/Pause" },
		{ keys: ["←"], label: "-5 сек" },
		{ keys: ["→"], label: "+5 сек" },
		{ keys: ["ESC"], label: "Закрыть" },
	],
	editor: [
		{ keys: ["⌘", "S"], label: "Сохранить" },
		{ keys: ["⌘", "B"], label: "Жирный" },
		{ keys: ["⌘", "I"], label: "Курсив" },
		{ keys: ["ESC"], label: "Отменить" },
	],
};
