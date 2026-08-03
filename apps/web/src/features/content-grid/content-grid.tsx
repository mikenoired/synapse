"use client";

import { Button } from "@synapse/ui/components";
import { FileText, Search } from "lucide-react";
import { memo } from "react";

import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import { useI18n } from "@/shared/lib/i18n";
import type { Content } from "@/shared/lib/schemas";

import { ContentMasonry } from "./content-masonry";

interface ContentGridProps {
	items: Content[];
	isLoading: boolean;
	fetchNext?: () => void;
	hasNext?: boolean;
	isFetchingNext?: boolean;
	onContentUpdated: (content: Content) => void;
	onContentDeleted: (contentId: string) => void;
	onItemClick: (item: Content) => void;
	onItemHover?: () => void;
	searchQuery?: string;
	selectedTags?: string[];
	selectedContentTypes?: Content["type"][];
	onClearFilters?: () => void;
	onAddContent?: () => void;
	excludedTag?: string;
}

export const ContentGrid = memo(
	({
		items,
		isLoading,
		fetchNext,
		hasNext,
		isFetchingNext,
		onContentUpdated,
		onContentDeleted,
		onItemClick,
		onItemHover,
		searchQuery,
		selectedTags,
		selectedContentTypes,
		onClearFilters,
		onAddContent,
		excludedTag,
	}: ContentGridProps) => {
		const hasContent = items.length > 0;
		const hasSelectedTags = Boolean(selectedTags?.length);
		const hasSelectedContentTypes = Boolean(selectedContentTypes?.length);
		const showEmptyState =
			!isLoading && !hasContent && !searchQuery && !hasSelectedTags && !hasSelectedContentTypes;
		const showNotFoundState =
			!isLoading && !hasContent && (searchQuery || hasSelectedTags || hasSelectedContentTypes);

		const sentinelRef = useInfiniteScroll({
			enabled: Boolean(hasNext && !isFetchingNext),
			onLoadMore: fetchNext,
		});
		const { t } = useI18n();

		if (isLoading) {
			return <ContentMasonry items={[]} isLoading />;
		}

		if (showEmptyState) {
			return (
				<div className="flex flex-col items-center justify-center h-full text-center py-12">
					<div className="w-full max-w-md p-8 space-y-4">
						<FileText className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
						<div>
							<h3 className="text-xl font-semibold mb-2">{t("empty.title")}</h3>
							<p className="text-muted-foreground mb-6">{t("empty.description")}</p>
							{onAddContent && <Button onClick={onAddContent}>{t("addContent")}</Button>}
						</div>
					</div>
				</div>
			);
		}

		if (showNotFoundState) {
			return (
				<div className="text-center py-12">
					<div className="text-muted-foreground">
						<Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
						<p className="text-lg mb-2">{t("notFound.title")}</p>
						<p className="text-sm">{t("notFound.description")}</p>
						{onClearFilters && (
							<Button variant="tertiary" onClick={onClearFilters} className="mt-4">
								{t("clearFilters")}
							</Button>
						)}
					</div>
				</div>
			);
		}

		return (
			<>
				<ContentMasonry
					items={items}
					onContentUpdated={onContentUpdated}
					onContentDeleted={onContentDeleted}
					onItemClick={onItemClick}
					onItemHover={onItemHover}
					excludedTag={excludedTag}
				/>
				{hasNext && <div ref={sentinelRef} aria-hidden className="h-px w-full" />}
			</>
		);
	}
);
