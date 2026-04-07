"use client";

import { Skeleton } from "@synapse/ui/components";
import Link from "next/link";
import type { DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { TagStack } from "@/entities/item/ui/tag-stack";
import { trpc } from "@/shared/api/trpc";
import { useDashboard } from "@/shared/lib/dashboard-context";
import type { Content } from "@/shared/lib/schemas";
import { normalizeDroppedFiles } from "@/shared/lib/upload-file-kind";

export default function TagsClient({ initial }: { initial: { id: string; title: string; items: Content[] }[] }) {
	const { openAddDialog, setAddDialogDefaults, setPreloadedFiles } = useDashboard();
	const [dragActive, setDragActive] = useState(false);
	const dragCounter = useRef(0);
	const utils = trpc.useUtils();

	const {
		data: tagsWithContentData,
		isLoading: tagsLoading,
	} = trpc.content.getTagsWithContent.useQuery(undefined, {
		initialData: initial,
		refetchOnMount: false,
	});

	const isLoading = tagsLoading && !tagsWithContentData?.length;

	const tagsWithContent = tagsWithContentData ?? [];

	const handleContentAdded = useCallback(
		(_content?: Content | Content[]) => {
			void Promise.all([
				utils.content.getTags.invalidate(),
				utils.content.getTagsWithContent.invalidate(),
				utils.graph.getGraph.invalidate(),
				utils.user.getStorageUsage.invalidate(),
			]);
		},
		[utils]
	);

	useEffect(() => {
		setAddDialogDefaults({ initialTags: [], onContentAdded: handleContentAdded });
		return () => setAddDialogDefaults({ initialTags: [], onContentAdded: null });
	}, [setAddDialogDefaults, handleContentAdded]);

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
		if (!dragCounter.current) setDragActive(false);
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
			openAddDialog({ initialTags: [], onContentAdded: handleContentAdded });
		}
	};

	if (isLoading) {
		return (
			<div className="p-6">
				<h1 className="text-2xl font-semibold mb-6">Tags</h1>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="space-y-4">
							<Skeleton className="h-6 w-1/3 rounded-md" />
							<Skeleton className="h-40 w-full rounded-xl" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (!tagsWithContentData || !tagsWithContentData.length) {
		return (
			<div
				className="p-6 text-center h-full"
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
				<h1 className="text-2xl font-semibold mb-4">Tags</h1>
				<p className="text-muted-foreground">You don't have any tags. Create new one.</p>
			</div>
		);
	}

	return (
		<div
			className="p-6 h-full"
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
			<h1 className="text-2xl font-semibold mb-8">Tags</h1>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-x-6 gap-y-12">
				{tagsWithContent.map(({ id, title, items }) => (
					<Link key={id} href={`/dashboard/tag/${id}`} className="group">
						<h2 className="text-lg font-medium mb-3 capitalize group-hover:text-primary transition-colors">
							{title}
						</h2>
						<TagStack items={items} />
					</Link>
				))}
			</div>
		</div>
	);
}
