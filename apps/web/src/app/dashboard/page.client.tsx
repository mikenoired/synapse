"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { DragEvent } from "react";
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/shared/api/trpc";
import type { ContentListQueryInput } from "@/shared/lib/content-query-sync";
import { useDashboard } from "@/shared/lib/dashboard-context";
import type { Content } from "@/shared/lib/schemas";
import { normalizeDroppedFiles } from "@/shared/lib/upload-file-kind";
import { useModal } from "@/widgets/modals/context/modal-context";

const ContentFilter = lazy(() =>
	import("@/features/content-filter/content-filter").then((mod) => ({ default: mod.ContentFilter }))
);
const ContentGrid = lazy(() =>
	import("@/features/content-grid/content-grid").then((mod) => ({ default: mod.ContentGrid }))
);

export default function DashboardClient({
	initial,
}: {
	initial: { items: Content[]; nextCursor: string | undefined };
}) {
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const { openAddDialog, setAddDialogDefaults, setPreloadedFiles } = useDashboard();
	const { openModal } = useModal();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [dragActive, setDragActive] = useState(false);
	const dragCounter = useRef(0);
	const utils = trpc.useUtils();

	useEffect(() => {
		if (!searchQuery) {
			setDebouncedSearchQuery("");
			return;
		}
		const timeout = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
		return () => window.clearTimeout(timeout);
	}, [searchQuery]);

	const queryInput = useMemo<ContentListQueryInput>(
		() => ({
			search: debouncedSearchQuery || undefined,
			tagIds: selectedTags.length > 0 ? selectedTags : undefined,
			limit: 12,
		}),
		[debouncedSearchQuery, selectedTags]
	);

	const {
		data: contentData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: contentLoading,
	} = trpc.content.getAll.useInfiniteQuery(queryInput, {
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialData:
			queryInput.search || queryInput.tagIds ? undefined : { pages: [initial], pageParams: [undefined] },
		refetchOnMount: false,
		retry: false,
	});

	const content: Content[] = contentData?.pages.flatMap((page) => page.items) ?? [];

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
			const contentList = Array.isArray(nextContent) ? nextContent : nextContent ? [nextContent] : [];

			for (const content of contentList) {
				utils.content.getById.setData({ id: content.id }, content);
			}

			void utils.content.getAll.invalidate();
			invalidateRelatedQueries();
		},
		[invalidateRelatedQueries, utils]
	);

	const handleContentUpdated = useCallback(
		(nextContent: Content) => {
			utils.content.getById.setData({ id: nextContent.id }, nextContent);
			void utils.content.getAll.invalidate();
			invalidateRelatedQueries();
		},
		[invalidateRelatedQueries, utils]
	);

	const handleContentDeleted = useCallback(
		(contentId: string) => {
			void utils.content.getAll.invalidate();
			void utils.content.getById.invalidate({ id: contentId });
			invalidateRelatedQueries();
		},
		[invalidateRelatedQueries, utils]
	);

	useEffect(() => {
		if (!searchParams) return;
		const tagsFromUrl = searchParams.get("tags");
		setSelectedTags(tagsFromUrl ? tagsFromUrl.split(",") : []);
	}, [searchParams]);

	useEffect(() => {
		setAddDialogDefaults({ initialTags: [], onContentAdded: handleContentAdded });
		return () => setAddDialogDefaults({ initialTags: [], onContentAdded: null });
	}, [setAddDialogDefaults, handleContentAdded]);

	useEffect(() => {
		const handleWindowDragEnter = (e: Event) => {
			const event = e as unknown as DragEvent;
			event.preventDefault();
			event.stopPropagation();
			dragCounter.current++;
			setDragActive(true);
		};
		const handleWindowDragLeave = (e: Event) => {
			const event = e as unknown as DragEvent;
			event.preventDefault();
			event.stopPropagation();
			dragCounter.current--;
			if (!dragCounter.current) setDragActive(false);
		};
		const handleWindowDragOver = (e: Event) => {
			const event = e as unknown as DragEvent;
			event.preventDefault();
			event.stopPropagation();
		};
		const handleWindowDrop = (e: Event) => {
			const event = e as unknown as DragEvent;
			event.preventDefault();
			event.stopPropagation();
			setDragActive(false);
			dragCounter.current = 0;
			const { files } = normalizeDroppedFiles(Array.from(event.dataTransfer?.files ?? []));
			if (files.length > 0) {
				setPreloadedFiles(files);
				openAddDialog();
			}
		};
		window.addEventListener("dragenter", handleWindowDragEnter);
		window.addEventListener("dragleave", handleWindowDragLeave);
		window.addEventListener("dragover", handleWindowDragOver);
		window.addEventListener("drop", handleWindowDrop);
		return () => {
			window.removeEventListener("dragenter", handleWindowDragEnter);
			window.removeEventListener("dragleave", handleWindowDragLeave);
			window.removeEventListener("dragover", handleWindowDragOver);
			window.removeEventListener("drop", handleWindowDrop);
		};
	}, [openAddDialog, setPreloadedFiles]);

	const deleteContentMutation = trpc.content.delete.useMutation();

	const handleItemClick = (item: Content) => {
		openModal({
			type: "viewer",
			contentType: item.type,
			item,
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

	const clearFilters = () => {
		setSearchQuery("");
		setSelectedTags([]);
		router.push("/dashboard");
	};

	return (
		<div className="flex min-w-0 flex-col h-full relative">
			{dragActive && (
				<div
					className="fixed inset-0 z-[100] bg-black/60 flex flex-col items-center justify-center pointer-events-auto select-none transition-all animate-in fade-in-0"
					style={{ backdropFilter: "blur(2px)" }}>
					<div className="flex flex-col items-center gap-4">
						<svg
							width="64"
							height="64"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							className="text-primary animate-bounce">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 19V6m0 0l-5 5m5-5l5 5"
							/>
						</svg>
						<div className="bg-white/90 rounded-xl px-8 py-6 text-2xl font-semibold shadow-xl border-2 border-primary animate-in fade-in-0 text-center">
							Перетащите файлы, чтобы добавить контент
							<div className="text-base font-normal mt-2 text-muted-foreground">
								Поддерживаются изображения, видео, аудио и документы
							</div>
						</div>
					</div>
				</div>
			)}
			<main className="min-w-0 flex-1 overflow-y-auto relative">
				<ContentFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
				<div className="p-4">
					<ContentGrid
						items={content}
						isLoading={contentLoading && content.length === 0}
						onContentUpdated={handleContentUpdated}
						onContentDeleted={handleContentDeleted}
						onItemClick={handleItemClick}
						searchQuery={debouncedSearchQuery}
						selectedTags={selectedTags}
						onClearFilters={clearFilters}
						onAddContent={openAddDialog}
						fetchNext={fetchNextPage}
						hasNext={hasNextPage}
						isFetchingNext={isFetchingNextPage}
					/>
				</div>
			</main>
		</div>
	);
}
