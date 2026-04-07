"use client";

import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ContentGrid } from "@/features/content-grid/content-grid";
import { trpc } from "@/shared/api/trpc";
import { useAuth } from "@/shared/lib/auth-context";
import { useDashboard } from "@/shared/lib/dashboard-context";
import type { Content } from "@/shared/lib/schemas";
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
	const { user, loading } = useAuth();
	const router = useRouter();
	const deleteContentMutation = trpc.content.delete.useMutation();

	const {
		data: queryData,
		isLoading: contentLoading,
		refetch: refetchContent,
	} = trpc.content.getAll.useQuery(
		{
			tagIds: [tagId],
			limit: 20,
		},
		{
			enabled: !!user || initial.items.length > 0,
			retry: false,
			initialData: initial,
		}
	);

	const content: Content[] = queryData?.items ?? [];

	useEffect(() => {
		if (!loading && !user && !initial.items.length) router.push("/");
	}, [user, loading, router, initial.items.length]);

	const handleContentChanged = useCallback(() => {
		refetchContent();
	}, [refetchContent]);

	useEffect(() => {
		setAddDialogDefaults({ initialTags: [tagTitle], onContentAdded: handleContentChanged });
		return () => setAddDialogDefaults({ initialTags: [], onContentAdded: null });
	}, [setAddDialogDefaults, tagTitle, handleContentChanged]);

	const handleItemClick = (item: Content) => {
		openModal({
			type: "viewer",
			contentType: item.type,
			item: item,
			props: {
				gallery: content
					.filter((i) => i.type === "media")
					.flatMap((i) => {
						try {
							const parsed = JSON.parse(i.content);
							const media = parsed?.media;
							if (media?.url) {
								return [
									{
										url: media.url,
										parentId: i.id,
										media_type: media.type,
										thumbnail_url: media.thumbnailUrl,
									},
								];
							}
						} catch {}
						return [];
					}),
				onEdit: (id: string) => {
					router.push(`/edit/${id}`);
				},
				onDelete: (id: string) => {
					deleteContentMutation.mutate(
						{ id },
						{
							onSuccess: () => {
								handleContentChanged();
							},
						}
					);
				},
				onContentChanged: handleContentChanged,
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
		const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
		if (files.length > 0) {
			setPreloadedFiles(files);
			openAddDialog({ initialTags: [tagTitle], onContentAdded: handleContentChanged });
		}
	};

	if (loading && initial.items.length!) {
		return (
			<div className="flex h-full items-center justify-center p-6">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

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
						Drop image for upload
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
					onContentChanged={handleContentChanged}
					onItemClick={handleItemClick}
					excludedTag={tagTitle}
				/>
			</main>
		</div>
	);
}
