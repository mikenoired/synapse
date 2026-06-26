"use client";

import { Button } from "@synapse/ui/components";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import { trpc } from "@/shared/api/trpc";
import type { Content } from "@/shared/lib/schemas";

export interface SuggestedTag {
	id: string;
	name: string;
}

interface DraftInput {
	mode: "draft";
	type: Content["type"];
	title?: string;
	content: string;
}

interface ExistingInput {
	mode: "existing";
	contentId: string;
}

type GenerateTagsButtonProps = (DraftInput | ExistingInput) & {
	disabled?: boolean;
	onResult: (existing: SuggestedTag[], newTags: string[]) => void;
	className?: string;
};

export function GenerateTagsButton({ disabled, onResult, className, ...input }: GenerateTagsButtonProps) {
	const mutation = trpc.ai.suggestTags.useMutation({
		onSuccess: (res) => {
			if (res.success) {
				const total = res.existing.length + res.newTags.length;
				if (total === 0) {
					toast("No tags suggested for this content");
				} else {
					toast.success(`Added ${total} tag${total > 1 ? "s" : ""}`);
				}
				onResult(res.existing, res.newTags);
			} else {
				toast.error(res.error ?? "Couldn't generate tags");
			}
		},
		onError: (error) => {
			toast.error(error.message || "Couldn't generate tags");
		},
	});

	return (
		<Button
			type="button"
			variant="default"
			size="sm"
			className={className}
			disabled={disabled || mutation.isPending}
			onClick={() => mutation.mutate(input)}
			title="Generate tags with AI">
			<Sparkles className={`size-4 ${mutation.isPending ? "animate-pulse" : ""}`} />
			{mutation.isPending ? "Generating…" : "AI tags"}
		</Button>
	);
}
