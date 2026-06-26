import type { KeyboardEvent } from "react";
import { useCallback, useState } from "react";

import type { TagState } from "./types";

export function useTagManager(initialTags: string[] = []) {
	const [state, setState] = useState<TagState>({
		tags: initialTags,
		currentTag: "",
	});

	const updateCurrentTag = useCallback((tag: string) => {
		setState((prev) => ({ ...prev, currentTag: tag }));
	}, []);

	const addTag = useCallback(() => {
		const trimmedTag = state.currentTag.trim();
		if (trimmedTag && !state.tags.includes(trimmedTag)) {
			setState((prev) => ({
				tags: [...prev.tags, trimmedTag],
				currentTag: "",
			}));
		}
	}, [state.currentTag, state.tags]);

	const addTags = useCallback((names: string[]) => {
		const cleaned = names.map((name) => name.trim()).filter((name) => name.length > 0);
		if (cleaned.length === 0) return;
		setState((prev) => {
			const existing = new Set(prev.tags);
			const merged = [...prev.tags];
			for (const name of cleaned) {
				if (!existing.has(name)) {
					existing.add(name);
					merged.push(name);
				}
			}
			return { ...prev, tags: merged };
		});
	}, []);

	const removeTag = useCallback((tagToRemove: string) => {
		setState((prev) => ({
			...prev,
			tags: prev.tags.filter((tag) => tag !== tagToRemove),
		}));
	}, []);

	const resetTags = useCallback(() => {
		setState({
			tags: initialTags,
			currentTag: "",
		});
	}, [initialTags]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				addTag();
			}
			if (e.key === "Backspace" && state.currentTag === "") {
				e.preventDefault();
				removeTag(state.tags[state.tags.length - 1]);
			}
		},
		[addTag, removeTag, state.currentTag, state.tags]
	);

	return {
		tags: state.tags,
		currentTag: state.currentTag,
		updateCurrentTag,
		addTag,
		addTags,
		removeTag,
		resetTags,
		handleKeyDown,
	};
}
