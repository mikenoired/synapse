"use client";

import { Badge, Input } from "@synapse/ui/components";
import { X } from "lucide-react";
import { useId, useState } from "react";

import { trpc } from "@/shared/api/trpc";
import type { Content } from "@/shared/lib/schemas";

import { GenerateTagsButton, type SuggestedTag } from "./generate-tags-button";

type AiGenerate =
	| {
			mode: "draft";
			type: Content["type"];
			title?: string;
			content: string;
			disabled?: boolean;
	  }
	| {
			mode: "existing";
			contentId: string;
			disabled?: boolean;
	  };

interface TagEditorProps {
	tags: string[];
	onTagsChange: (tags: string[]) => void;
	disabled?: boolean;
	aiGenerate?: AiGenerate | null;
	inputClassName?: string;
	placeholder?: string;
}

const mediaTypes = new Set<Content["type"]>(["media", "audio", "doc", "pdf", "docx", "epub", "xlsx", "csv"]);

function normalizeTagTitle(title: string) {
	return title.trim().toLowerCase();
}

function mergeTags(tags: string[], names: string[]) {
	return Array.from(
		new Map(
			[...tags, ...names]
				.map((tag) => tag.trim())
				.filter(Boolean)
				.map((tag) => [normalizeTagTitle(tag), tag])
		).values()
	);
}

export function TagEditor({
	tags,
	onTagsChange,
	disabled = false,
	aiGenerate,
	inputClassName,
	placeholder = "+ Добавить тег",
}: TagEditorProps) {
	const listId = useId();
	const [currentTag, setCurrentTag] = useState("");
	const { data: tagSuggestions = [] } = trpc.content.getTags.useQuery(undefined, {
		refetchOnMount: false,
	});

	const selectedTags = new Set(tags.map(normalizeTagTitle));
	const availableSuggestions = tagSuggestions.filter(
		(tag) => !selectedTags.has(normalizeTagTitle(tag.title))
	);

	const addTag = () => {
		if (!currentTag.trim()) return;

		const nextTags = mergeTags(tags, [currentTag]);
		if (nextTags.length !== tags.length) {
			onTagsChange(nextTags);
		}
		setCurrentTag("");
	};

	const removeTag = (tagToRemove: string) => {
		onTagsChange(tags.filter((tag) => normalizeTagTitle(tag) !== normalizeTagTitle(tagToRemove)));
	};

	const handleAiTags = (existing: SuggestedTag[], newTags: string[]) => {
		onTagsChange(mergeTags(tags, [...existing.map((tag) => tag.name), ...newTags]));
	};

	const aiDisabled =
		disabled ||
		!aiGenerate ||
		aiGenerate.disabled ||
		(aiGenerate.mode === "draft" && mediaTypes.has(aiGenerate.type));

	return (
		<div className="flex flex-wrap gap-2">
			{tags.map((tag) => (
				<Badge key={tag} variant="secondary" className="flex items-center gap-1">
					{tag}
					<button
						type="button"
						onClick={() => removeTag(tag)}
						className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
						disabled={disabled}>
						<X className="w-3 h-3" />
					</button>
				</Badge>
			))}
			<Input
				list={listId}
				placeholder={placeholder}
				value={currentTag}
				onChange={(e) => setCurrentTag(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addTag();
					}
				}}
				className={inputClassName ?? "flex-1 min-w-[120px]"}
				disabled={disabled}
			/>
			<datalist id={listId}>
				{availableSuggestions.map((tag) => (
					<option key={tag.id} value={tag.title} />
				))}
			</datalist>
			{aiGenerate &&
				(aiGenerate.mode === "draft" ? (
					<GenerateTagsButton
						mode="draft"
						type={aiGenerate.type}
						title={aiGenerate.title}
						content={aiGenerate.content}
						disabled={aiDisabled}
						onResult={handleAiTags}
					/>
				) : (
					<GenerateTagsButton
						mode="existing"
						contentId={aiGenerate.contentId}
						disabled={aiDisabled}
						onResult={handleAiTags}
					/>
				))}
		</div>
	);
}
