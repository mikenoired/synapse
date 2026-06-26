"use client";

import { Button, Input } from "@synapse/ui/components";
import { Plus } from "lucide-react";
import { useState } from "react";

import { ContentTag } from "@/shared/ui/content-tag";

interface TagManagerProps {
	tags: string[];
	tagIds?: string[];
	onAddTag?: (tag: string) => void | Promise<void>;
	onRemoveTag?: (tag: string) => void | Promise<void>;
	editable?: boolean;
	className?: string;
	inputPlaceholder?: string;
}

export function TagManager({
	tags,
	tagIds,
	onAddTag,
	onRemoveTag,
	editable = true,
	className,
	inputPlaceholder = "Добавить тег...",
}: TagManagerProps) {
	const [newTag, setNewTag] = useState("");
	const [isAdding, setIsAdding] = useState(false);

	const handleAddTag = async () => {
		if (!newTag.trim() || !onAddTag) return;

		setIsAdding(true);
		try {
			await onAddTag(newTag.trim());
			setNewTag("");
		} finally {
			setIsAdding(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddTag();
		}
	};

	return (
		<div className={className}>
			{/* Existing tags */}
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-2 mb-3">
					{tags.map((tag, tagIndex) => (
						<ContentTag
							key={tag}
							tag={tag}
							tagId={editable ? undefined : tagIds?.[tagIndex]}
							onRemove={editable ? onRemoveTag : undefined}
							className="text-xs px-2 py-1 bg-muted/60 hover:bg-muted"
						/>
					))}
				</div>
			)}

			{/* Add new tag */}
			{editable && onAddTag && (
				<div className="flex gap-2">
					<Input
						placeholder={inputPlaceholder}
						value={newTag}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isAdding}
						className="flex-1"
					/>
					<Button
						type="button"
						onClick={handleAddTag}
						disabled={!newTag.trim() || isAdding}
						size="sm"
						variant="outline">
						<Plus className="w-4 h-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
