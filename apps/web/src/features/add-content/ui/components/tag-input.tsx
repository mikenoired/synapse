"use client";

import { Badge, Button, Input, Label } from "@synapse/ui/components";
import { X } from "lucide-react";

import type { Content } from "@/shared/lib/schemas";
import type { SuggestedTag } from "@/shared/ui/generate-tags-button";
import { GenerateTagsButton } from "@/shared/ui/generate-tags-button";

interface AiGenerateDraft {
	type: Content["type"];
	title?: string;
	content: string;
}

interface TagInputProps {
	tags: string[];
	currentTag: string;
	isLoading: boolean;
	onCurrentTagChange: (tag: string) => void;
	onAddTag: () => void;
	onRemoveTag: (tag: string) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	aiGenerate?: AiGenerateDraft | null;
	onAiTags?: (existing: SuggestedTag[], newTags: string[]) => void;
	suggestions?: string[];
}

export function TagInput({
	tags,
	currentTag,
	isLoading,
	onCurrentTagChange,
	onAddTag,
	onRemoveTag,
	onKeyDown,
	aiGenerate,
	onAiTags,
	suggestions = [],
}: TagInputProps) {
	const selectedTags = new Set(tags.map((tag) => tag.trim().toLowerCase()));
	const availableSuggestions = suggestions.filter((tag) => !selectedTags.has(tag.trim().toLowerCase()));

	return (
		<div className="space-y-3">
			<Label htmlFor="tags">Tags</Label>
			<div className="flex gap-2">
				<Input
					id="tags"
					list="tag-input-suggestions"
					placeholder="Add tag..."
					value={currentTag}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCurrentTagChange(e.target.value)}
					onKeyDown={onKeyDown}
					className="flex-1"
					disabled={isLoading}
				/>
				<datalist id="tag-input-suggestions">
					{availableSuggestions.map((tag) => (
						<option key={tag} value={tag} />
					))}
				</datalist>
				<Button type="button" onClick={onAddTag} disabled={!currentTag.trim() || isLoading} size="sm">
					Add
				</Button>
				{aiGenerate && onAiTags && (
					<GenerateTagsButton
						mode="draft"
						type={aiGenerate.type}
						title={aiGenerate.title}
						content={aiGenerate.content}
						disabled={isLoading}
						onResult={(existing, newTags) => onAiTags(existing, newTags)}
					/>
				)}
			</div>
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{tags.map((tag) => (
						<Badge key={tag} variant="secondary" className="flex items-center gap-1">
							{tag}
							<button
								type="button"
								onClick={() => onRemoveTag(tag)}
								className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
								disabled={isLoading}>
								<X className="w-3 h-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
		</div>
	);
}
