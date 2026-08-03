import {
	CheckboxGroup,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	ReadonlyCheckboxItem,
} from "@synapse/ui/components";
import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { EditContentDialog } from "@/features/edit-content/ui/edit-content-dialog";
import { trpc } from "@/shared/api/trpc";
import { useI18n } from "@/shared/lib/i18n";
import type { Content, LinkContent } from "@/shared/lib/schemas";
import { extractTextFromStructuredContent, parseLinkContent } from "@/shared/lib/schemas";
import { ContentTag } from "@/shared/ui/content-tag";

import DocumentItem from "./document-item";
import MediaItem from "./media-item";

function getNotePreview(content: string, maxLength: number = 280): string {
	try {
		const parsed = JSON.parse(content);
		const text = parsed?.type === "doc" ? extractTextFromStructuredContent(parsed) : content;
		const normalized = text.replace(/\s+/g, " ").trim();

		if (normalized.length <= maxLength) {
			return normalized;
		}

		return `${normalized.slice(0, maxLength).trimEnd()}...`;
	} catch {
		const normalized = content.replace(/\s+/g, " ").trim();
		return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength).trimEnd()}...`;
	}
}

interface ItemProps {
	item: Content;
	index: number;
	onContentUpdated?: (content: Content) => void;
	onContentDeleted?: (contentId: string) => void;
	onItemClick?: (content: Content) => void;
	excludedTag?: string;
	disableAnimation?: boolean;
}

export default function Item({
	item,
	index,
	onContentUpdated,
	onContentDeleted,
	onItemClick,
	excludedTag,
	disableAnimation,
}: ItemProps) {
	const [editOpen, setEditOpen] = useState(false);
	const utils = trpc.useUtils();
	const { t } = useI18n();

	const deleteMutation = trpc.content.delete.useMutation({
		onSuccess: () => {
			void Promise.all([
				utils.content.getTags.invalidate(),
				utils.content.getTagsWithContent.invalidate(),
				utils.content.getTagsWithContentPage.invalidate(),
				utils.content.getSuggestions.invalidate(),
				utils.graph.getGraph.invalidate(),
				utils.user.getStorageUsage.invalidate(),
			]);
			toast.success("Элемент удален");
			onContentDeleted?.(item.id);
		},
	});

	const handleDelete = () => deleteMutation.mutate({ id: item.id });
	const handleEdit = () => setEditOpen(true);

	const displayTags = excludedTag ? item.tags.filter((tag) => tag !== excludedTag) : item.tags;
	const displayTagIds = excludedTag
		? item.tag_ids.filter((_, tagIndex) => item.tags[tagIndex] !== excludedTag)
		: item.tag_ids;

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger>
					<div onClick={() => onItemClick?.(item)} className="cursor-pointer">
						<ItemContent
							item={{
								...item,
								tags: displayTags,
								tag_ids: displayTagIds,
							}}
							index={index}
							disableAnimation={disableAnimation}
						/>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem onClick={() => onItemClick?.(item)}>{t("open")}</ContextMenuItem>
					<ContextMenuItem onClick={handleEdit}>{t("edit")}</ContextMenuItem>
					<ContextMenuItem onClick={handleDelete}>{t("delete")}</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			{editOpen && item.type === "note" && (
				<EditContentDialog
					open={editOpen}
					onOpenChange={setEditOpen}
					content={item}
					onContentUpdated={onContentUpdated}
				/>
			)}
		</>
	);
}

function ItemContent({ item, index, onItemClick, disableAnimation }: ItemProps) {
	const { t } = useI18n();
	const notePreview = useMemo(() => {
		if (item.type !== "note") return item.content;
		return getNotePreview(item.content);
	}, [item.content, item.type]);

	const renderTodoPreview = () => {
		let todos: { text: string; marked: boolean }[] = [];
		try {
			todos = JSON.parse(item.content);
		} catch {}
		const done = todos.filter((t) => t.marked).length;
		return (
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
					<ListChecks className="w-4 h-4" />
					{done} /{todos.length} {t("done")}
				</div>
				<CheckboxGroup className="gap-1">
					{todos.slice(0, 3).map((todo, idx) => (
						<ReadonlyCheckboxItem key={idx} checked={todo.marked} label={todo.text} className="px-0" />
					))}
				</CheckboxGroup>
				{todos.length > 3 && (
					<div className="text-xs text-muted-foreground">
						+{todos.length - 3}
						...
					</div>
				)}
				{item.tags && (
					<div className="flex flex-wrap gap-1 mt-3">
						{item.tags.map((tag: string, tagIndex) => (
							<ContentTag
								key={tag}
								tag={tag}
								tagId={item.tag_ids[tagIndex]}
								variant="outline"
								className="text-xs"
							/>
						))}
					</div>
				)}
			</div>
		);
	};

	const isDocumentType = (type: string) => {
		return ["doc", "pdf", "docx", "epub", "xlsx", "csv"].includes(type);
	};

	const renderLinkPreview = () => {
		const linkContent: LinkContent | null = parseLinkContent(item.content);

		if (!linkContent) {
			return (
				<>
					<div className="mb-4">
						<a
							href={item.content}
							target="_blank"
							rel="noopener noreferrer"
							className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
							{item.content}
						</a>
					</div>
				</>
			);
		}

		const fullText = linkContent.rawText || extractTextFromStructuredContent(linkContent.content);
		const previewText = fullText.length > 200 ? `${fullText.substring(0, 200)}...` : fullText;

		return (
			<div className="space-y-3">
				<h3 className="font-semibold text-base leading-tight line-clamp-2">
					{linkContent.title || item.title || t("untitled")}
				</h3>

				{previewText && (
					<p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{previewText}</p>
				)}

				<div className="text-xs text-blue-600 dark:text-blue-400 truncate">{linkContent.url}</div>
			</div>
		);
	};

	return (
		<motion.div
			initial={disableAnimation ? false : { opacity: 0, y: 20 }}
			animate={disableAnimation ? undefined : { opacity: 1, y: 0 }}
			transition={disableAnimation ? undefined : { duration: 0.2 }}
			className="group">
			<div
				className={`cursor-pointer overflow-hidden relative transition-all ${
					item.type === "note" ? "min-h-44 rounded-xl bg-card text-card-foreground" : "hover:shadow-lg"
				}`}>
				<div
					className={
						item.type === "media" || item.type === "audio"
							? "p-0"
							: item.type === "note"
								? "flex min-h-44 flex-col p-5"
								: item.type === "todo"
									? "p-3"
									: item.type === "link"
										? "p-3"
										: ""
					}>
					{item.type === "media" || item.type === "audio" ? (
						<MediaItem item={item} onItemClick={onItemClick} />
					) : isDocumentType(item.type) ? (
						<DocumentItem item={item} index={index} onItemClick={onItemClick} />
					) : item.type === "link" ? (
						<>
							{renderLinkPreview()}
							{item.tags.length > 0 && (
								<div className="flex flex-wrap gap-1 mt-3">
									{item.tags.map((tag: string, tagIndex) => (
										<ContentTag
											key={tag}
											tag={tag}
											tagId={item.tag_ids[tagIndex]}
											variant="outline"
											className="text-xs"
										/>
									))}
								</div>
							)}
						</>
					) : item.type === "todo" ? (
						renderTodoPreview()
					) : (
						<>
							<h3 className="line-clamp-2 text-lg font-semibold leading-snug tracking-tight text-foreground">
								{item.title || t("untitled")}
							</h3>
							<p className="mt-3 line-clamp-5 whitespace-pre-wrap wrap-break-words text-sm leading-6 text-muted-foreground">
								{notePreview || t("emptyNote")}
							</p>
							<div className="mt-auto flex flex-wrap gap-1 pt-5">
								{item.tags.map((tag: string, tagIndex) => (
									<ContentTag
										key={tag}
										tag={tag}
										tagId={item.tag_ids[tagIndex]}
										className="text-xs font-normal"
									/>
								))}
							</div>
						</>
					)}
				</div>
			</div>
		</motion.div>
	);
}
