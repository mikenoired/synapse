"use client";

import { cn } from "@synapse/ui/cn";
import { Button } from "@synapse/ui/components";
import { prose } from "@synapse/ui/prose";
import { Edit2, ExternalLink, Globe, Image as ImageIcon, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { Content, LinkContent } from "@/shared/lib/schemas";
import { calculateReadingTimeFromLinkContent, parseLinkContent } from "@/shared/lib/schemas";

import { BaseModal } from "../base";
import { ActionBar } from "../components";
import { ConfirmDialog } from "../dialogs";
import { useModalKeyboard } from "../hooks";
import { ModalBody, ModalHeader } from "../layout";
import { showToast } from "../utils";

function StructuredContentRenderer({ content }: { content: any }) {
	if (!content?.content) return null;

	return (
		<article className={cn("max-w-none", prose)}>
			{content.content.map((block: any, index: number) => {
				switch (block.type) {
					case "heading": {
						const level = Math.min(block.attrs?.level || 1, 6);
						const headingClasses = {
							1: "text-3xl font-bold mb-6 mt-8 first:mt-0 text-foreground",
							2: "text-2xl font-semibold mb-4 mt-6 text-foreground",
							3: "text-xl font-semibold mb-3 mt-5 text-foreground",
							4: "text-lg font-semibold mb-3 mt-4 text-foreground",
							5: "text-base font-semibold mb-2 mt-3 text-foreground",
							6: "text-sm font-semibold mb-2 mt-3 text-foreground",
						};

						switch (level) {
							case 1:
								return (
									<h1 key={index} className={headingClasses[1]}>
										{block.content}
									</h1>
								);
							case 2:
								return (
									<h2 key={index} className={headingClasses[2]}>
										{block.content}
									</h2>
								);
							case 3:
								return (
									<h3 key={index} className={headingClasses[3]}>
										{block.content}
									</h3>
								);
							case 4:
								return (
									<h4 key={index} className={headingClasses[4]}>
										{block.content}
									</h4>
								);
							case 5:
								return (
									<h5 key={index} className={headingClasses[5]}>
										{block.content}
									</h5>
								);
							case 6:
								return (
									<h6 key={index} className={headingClasses[6]}>
										{block.content}
									</h6>
								);
							default:
								return (
									<h2 key={index} className={headingClasses[2]}>
										{block.content}
									</h2>
								);
						}
					}

					case "paragraph":
						return (
							<p key={index} className="mb-4 leading-7 text-foreground/90">
								{block.content}
							</p>
						);

					case "image":
						return (
							<figure key={index} className="my-6 space-y-2">
								<img
									src={block.attrs?.src}
									alt={block.attrs?.alt || ""}
									className="w-full h-auto rounded-lg border border-border shadow-sm"
									loading="lazy"
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
								/>
								{block.attrs?.alt && (
									<figcaption className="text-sm text-muted-foreground text-center italic">
										{block.attrs.alt}
									</figcaption>
								)}
							</figure>
						);

					case "quote":
						return (
							<blockquote
								key={index}
								className="border-l-4 border-primary bg-muted/50 px-4 py-3 my-5 rounded-r-md">
								<p className="italic text-foreground/80 mb-0">{block.content}</p>
							</blockquote>
						);

					case "code":
						return (
							<pre
								key={index}
								className="bg-muted border border-border p-4 rounded-lg font-mono text-sm overflow-x-auto my-5">
								<code className="text-foreground">{block.content}</code>
							</pre>
						);

					case "list": {
						const items = block.content?.split("\n").filter((item: string) => item.trim());
						const isOrdered = block.attrs?.listType === "ordered";

						return isOrdered ? (
							<ol key={index} className="my-4 space-y-2 list-decimal list-inside">
								{items?.map((item: string, itemIndex: number) => (
									<li key={itemIndex} className="text-foreground/90 leading-7">
										{item.trim()}
									</li>
								))}
							</ol>
						) : (
							<ul key={index} className="my-4 space-y-2 list-disc list-inside">
								{items?.map((item: string, itemIndex: number) => (
									<li key={itemIndex} className="text-foreground/90 leading-7">
										{item.trim()}
									</li>
								))}
							</ul>
						);
					}

					case "divider":
						return <hr key={index} className="my-8 border-border" />;

					default:
						return null;
				}
			})}
		</article>
	);
}

interface LinkViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

export function LinkViewerModal({ open, onOpenChange, item, onEdit, onDelete }: LinkViewerModalProps) {
	const router = useRouter();
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const linkContent: LinkContent | null = useMemo(
		() => (item.type === "link" ? parseLinkContent(item.content) : null),
		[item.content, item.type]
	);
	const readingTime = useMemo(
		() => (linkContent ? calculateReadingTimeFromLinkContent(linkContent) : undefined),
		[linkContent]
	);

	useModalKeyboard({
		enabled: open,
		onEscape: () => onOpenChange(false),
	});

	const handleEdit = () => {
		if (onEdit) {
			onEdit(item.id);
		} else {
			router.push(`/edit/${item.id}`);
		}
		onOpenChange(false);
	};

	const handleDelete = () => {
		if (onDelete) {
			setShowDeleteConfirm(true);
		}
	};

	const handleOpenLink = () => {
		const url = linkContent?.url || item.content || item.url;
		if (url) window.open(url, "_blank", "noopener,noreferrer");
	};

	const actions = [
		{
			icon: ExternalLink,
			label: "Открыть",
			onClick: handleOpenLink,
			variant: "outline" as const,
		},
		...(onEdit
			? [
					{
						icon: Edit2,
						label: "Редактировать",
						onClick: handleEdit,
						variant: "outline" as const,
					},
				]
			: []),
		...(onDelete
			? [
					{
						icon: Trash2,
						label: "Удалить",
						onClick: handleDelete,
						variant: "destructive" as const,
					},
				]
			: []),
	];

	return (
		<>
			<BaseModal open={open} onOpenChange={onOpenChange} size="xl">
				<div className="flex flex-col h-full">
					<ModalHeader>
						<div className="space-y-4">
							<ModalHeader.Meta icon={Globe} type={linkContent?.metadata.siteName || "Ссылка"} />
							<ModalHeader.Title>{linkContent?.title || item.title || "Без названия"}</ModalHeader.Title>
							<ModalHeader.Info createdAt={item.created_at} readingTime={readingTime} />
							{item.tags.length > 0 && <ModalHeader.Tags tags={item.tags} />}
							<ActionBar actions={actions} />
						</div>
					</ModalHeader>

					<ModalBody scrollable>
						{linkContent ? (
							<div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-6">
								<div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
									<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
										<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
											<Globe className="size-4" />
											<span className="truncate max-w-[220px]">{new URL(linkContent.url).hostname}</span>
										</div>
										{linkContent.metadata.author && (
											<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
												<User className="size-3.5" />
												<span className="truncate max-w-[220px]">{linkContent.metadata.author}</span>
											</div>
										)}
									</div>

									{linkContent.metadata.image && (
										<div className="relative mt-5 w-full overflow-hidden rounded-2xl border border-border bg-muted/20">
											<img
												src={linkContent.metadata.image}
												alt={linkContent.title || "Article image"}
												className="h-64 w-full object-cover md:h-80"
												onError={(e) => {
													e.currentTarget.style.display = "none";
												}}
											/>
										</div>
									)}
								</div>

								<div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
									<div className="max-w-none">
										<StructuredContentRenderer content={linkContent.content} />
									</div>
								</div>

								{linkContent.metadata.images && linkContent.metadata.images.length > 1 && (
									<div className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
										<h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
											<ImageIcon className="w-4 h-4" />
										Дополнительные изображения
									</h3>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
										{linkContent.metadata.images.slice(1).map((img, index) => (
											<img
												key={index}
												src={img}
												alt={`Additional image ${index + 1}`}
												className="w-full h-24 object-cover rounded-lg border border-border"
												loading="lazy"
												onError={(e) => {
													e.currentTarget.style.display = "none";
												}}
											/>
										))}
									</div>
										</div>
									)}
								</div>
							) : (
							<div className="flex items-center justify-center py-8">
								<div className="max-w-md space-y-6 text-center">
									<div className="rounded-2xl border border-border bg-card p-6">
										<div className="space-y-3">
											<p className="rounded-xl bg-muted/50 p-3 text-left font-mono text-sm break-all">
												{item.content}
											</p>
											<Button onClick={handleOpenLink} className="w-full rounded-full" size="lg">
												<ExternalLink className="w-4 h-4 mr-2" />
												Открыть ссылку
										</Button>
									</div>
								</div>
								<div className="text-xs text-muted-foreground">Ссылка была сохранена в старом формате</div>
							</div>
						</div>
					)}
					</ModalBody>
				</div>
			</BaseModal>

			<ConfirmDialog
				open={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				title="Удалить ссылку?"
				description="Это действие нельзя отменить. Ссылка будет удалена навсегда."
				confirmText="Удалить"
				cancelText="Отмена"
				variant="destructive"
				onConfirm={async () => {
					if (!onDelete) return;
					try {
						await onDelete(item.id);
						showToast.success("Ссылка удалена");
						onOpenChange(false);
					} catch {
						showToast.error("Ошибка при удалении");
					}
				}}
			/>
		</>
	);
}
