"use client";

import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ContentGrid } from "@/features/content-grid/content-grid";
import { trpc } from "@/shared/api/trpc";
import {
	removeContentFromList,
	type ContentListQueryInput,
	upsertContentInList,
} from "@/shared/lib/content-query-sync";
import { useDashboard } from "@/shared/lib/dashboard-context";
import type { Content } from "@/shared/lib/schemas";
import { normalizeDroppedFiles } from "@/shared/lib/upload-file-kind";
import { useModal } from "@/widgets/modals";

interface Props {
	tagId: string;
	tagTitle: string;
	initial: { items: Content[]; nextCursor: string | undefined };
}

export default function TagClient({ tagId, tagTitle, initial }: Props) {
	const { openAddDialog, setAddDialogDefaults, setPreloadedFiles } = useDashboard();
	const { openModal } = useModal();
	const [dragActive, setDragActive] = useState(false);
	const dragCounter = useRef(0);
	const router = useRouter();
	const utils = trpc.useUtils();
	const queryInput = useMemo<ContentListQueryInput>(
		() => ({
			tagIds: [tagId],
			limit: 20,
		}),
		[tagId]
	);
	const deleteContentMutation = trpc.content.delete.useMutation();

	const {
		data: queryData,
		isLoading: contentLoading,
	} = trpc.content.getAll.useQuery(
		queryInput,
		{
			retry: false,
			initialData: initial,
		}
	);

	const content: Content[] = queryData?.items ?? [];

	const invalidateRelatedQueries = useCallback(() => {
		void Promise.all([
			utils.content.getTags.invalidate(),
			utils.content.getTagsWithContent.invalidate(),
			utils.graph.getGraph.invalidate(),
			utils.user.getStorageUsage.invalidate(),
		]);
	}, [utils]);

	const handleContentAdded = useCallback(
		(nextContent?: Content | Content[]) => {
			const contentList = Array.isArray(nextContent)
				? nextContent
				: nextContent
					? [nextContent]
					: [];

			if (contentList.length === 0) {
				void utils.content.getAll.invalidate(queryInput);
				invalidateRelatedQueries();
				return;
			}

			for (const content of contentList) {
				utils.content.getAll.setData(queryInput, (current) => upsertContentInList(current, content, queryInput));
				utils.content.getById.setData({ id: content.id }, content);
			}

			invalidateRelatedQueries();
		},
		[invalidateRelatedQueries, queryInput, utils]
	);

	const handleContentUpdated = useCallback(
		(nextContent: Content) => {
			utils.content.getAll.setData(queryInput, (current) => upsertContentInList(current, nextContent, queryInput));
			utils.content.getById.setData({ id: nextContent.id }, nextContent);
			invalidateRelatedQueries();
		},
		[invalidateRelatedQueries, queryInput, utils]
	);

	const handleContentDeleted = useCallback(
		(contentId: string) => {
			utils.content.getAll.setData(queryInput, (current) => removeContentFromList(current, contentId));
			void utils.content.getById.invalidate({ id: contentId });
			invalidateRelatedQueries();
		},
		[invalidateRelatedQueries, queryInput, utils]
	);

	useEffect(() => {
		setAddDialogDefaults({ initialTags: [tagTitle], onContentAdded: handleContentAdded });
		return () => setAddDialogDefaults({ initialTags: [], onContentAdded: null });
	}, [setAddDialogDefaults, tagTitle, handleContentAdded]);

	const handleItemClick = (item: Content) => {
		openModal({
			type: "viewer",
			contentType: item.type,
			item: item,
			props: {
				items: content,
				onEdit: (id: string) => {
					router.push(`/edit/${id}`);
				},
				onDelete: async (id: string) => {
					await deleteContentMutation.mutateAsync({ id });
					handleContentDeleted(id);
				},
				onContentUpdated: handleContentUpdated,
			},
		});
	};

	const handleDragEnter = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current++;
		setDragActive(true);
	};

	const handleDragLeave = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current--;
		if (dragCounter.current === 0) setDragActive(false);
	};

	const handleDragOver = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);
		dragCounter.current = 0;
		const { files } = normalizeDroppedFiles(Array.from(e.dataTransfer.files));
		if (files.length > 0) {
			setPreloadedFiles(files);
			openAddDialog({ initialTags: [tagTitle], onContentAdded: handleContentAdded });
		}
	};

	return (
		<div
			className="flex flex-col h-full relative"
			onDragEnter={handleDragEnter}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}>
			{dragActive && (
				<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none select-none">
					<div className="bg-white/90 rounded-xl px-8 py-6 text-2xl font-semibold shadow-xl border-2 border-primary animate-in fade-in-0">
						Drop files to add content
					</div>
				</div>
			)}
			<header className="flex items-center gap-2 px-6 py-4">
				<h1 className="text-2xl font-semibold capitalize">{tagTitle}</h1>
			</header>
			<main className="flex-1 overflow-y-auto p-6">
				<ContentGrid
					items={content}
					isLoading={contentLoading && content.length === 0}
					onContentUpdated={handleContentUpdated}
					onContentDeleted={handleContentDeleted}
					onItemClick={handleItemClick}
					excludedTag={tagTitle}
				/>
			</main>
		</div>
	);
}
