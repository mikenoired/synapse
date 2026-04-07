import { useEffect } from "react";

interface KeyboardShortcut {
	key: string;
	handler: () => void;
	ctrl?: boolean;
	shift?: boolean;
	meta?: boolean;
	preventDefault?: boolean;
}

interface UseModalKeyboardOptions {
	enabled?: boolean;
	onEscape?: () => void;
	shortcuts?: KeyboardShortcut[];
}

export function useModalKeyboard({ enabled = true, onEscape, shortcuts = [] }: UseModalKeyboardOptions = {}) {
	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && onEscape) {
				e.preventDefault();
				onEscape();
				return;
			}

			for (const shortcut of shortcuts) {
				const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
				const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
				const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;

				if (e.key === shortcut.key && ctrlMatch && shiftMatch && metaMatch) {
					if (shortcut.preventDefault) e.preventDefault();

					shortcut.handler();
					break;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [enabled, onEscape, shortcuts]);
}

export type KeyboardShortcutHint = {
	keys: string[];
	label: string;
	action: string;
};

export function useModalKeyboardHints(shortcuts: KeyboardShortcut[]): KeyboardShortcutHint[] {
	return shortcuts.map((shortcut) => {
		const keys: string[] = [];

		if (shortcut.meta || shortcut.ctrl) keys.push("⌘");

		if (shortcut.shift) keys.push("⇧");

		keys.push(shortcut.key.toUpperCase());

		return {
			keys,
			label: shortcut.key,
			action: "action",
		};
	});
}
