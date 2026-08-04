"use client";

import { Button, Input } from "@synapse/ui/components";
import { PlusIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { ContentTag } from "@/shared/ui/content-tag";

interface TagManagerProps {
	tags: string[];
	tagIds?: string[];
	onAddTag?: (tag: string) => void | Promise<void>;
	onRemoveTag?: (tag: string) => void | Promise<void>;
	editable?: boolean;
	className?: string;
	inputPlaceholder?: string;
	additionalAction?: ReactNode;
}

export function TagManager({
	tags,
	tagIds,
	onAddTag,
	onRemoveTag,
	editable = true,
	className,
	inputPlaceholder = "Добавить тег...",
	additionalAction,
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
				<div className="flex min-w-0 flex-nowrap items-center gap-2">
					{additionalAction && <div className="shrink-0 whitespace-nowrap">{additionalAction}</div>}
					<div className="flex min-w-0 flex-1 overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
						<Input
							placeholder={inputPlaceholder}
							value={newTag}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
							onKeyDown={handleKeyDown}
							disabled={isAdding}
							className="h-8 min-w-0 flex-1 rounded-none border-0 focus-visible:border-transparent focus-visible:ring-0"
						/>
						<Button
							onClick={handleAddTag}
							disabled={!newTag.trim() || isAdding}
							size="icon-sm"
							variant="primary"
							className="shrink-0 rounded-none">
							<PlusIcon />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
