"use client";

import { Badge, Button, Input } from "@synapse/ui/components";
import { X } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/shared/api/trpc";
import type { Content } from "@/shared/lib/schemas";
import type { LinkContent } from "@/shared/lib/schemas";

import { ModalActions, ModalBody } from "../../layout";
import { showToast } from "../../utils";

interface AddLinkFormProps {
	initialTags?: string[];
	onSuccess: (content?: Content) => void;
}

export function AddLinkForm({ initialTags = [], onSuccess }: AddLinkFormProps) {
	const [url, setUrl] = useState("");
	const [title, setTitle] = useState("");
	const [tags, setTags] = useState<string[]>(initialTags);
	const [currentTag, setCurrentTag] = useState("");
	const [parsing, setParsing] = useState(false);
	const utils = trpc.useUtils();

	const createMutation = trpc.content.create.useMutation();
	const parseLink = async (targetUrl: string): Promise<LinkContent> => {
		const response = await fetch("/api/parse-link", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			credentials: "include",
			body: JSON.stringify({ url: targetUrl }),
		});

		const result = await response.json().catch(() => null);

		if (!response.ok || !result?.data) throw new Error(result?.error || "Не удалось распознать ссылку");

		return result.data as LinkContent;
	};

	const handleParseLink = async () => {
		if (!url.trim()) return;

		setParsing(true);
		try {
			const parsed = await parseLink(url.trim());
			if (parsed.title && !title) {
				setTitle(parsed.title);
			}
			showToast.success("Ссылка распознана");
		} catch {
			showToast.error("Не удалось распознать ссылку");
		} finally {
			setParsing(false);
		}
	};

	const handleAddTag = () => {
		const tag = currentTag.trim();
		if (tag && !tags.includes(tag)) {
			setTags([...tags, tag]);
			setCurrentTag("");
		}
	};

	const handleRemoveTag = (tag: string) => {
		setTags(tags.filter((t) => t !== tag));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!url.trim()) {
			showToast.error("Введите URL");
			return;
		}

		try {
			const content = await createMutation.mutateAsync({
				type: "link",
				title: title || undefined,
				content: url.trim(),
				tags,
			});

			void Promise.all([
				utils.content.getTags.invalidate(),
				utils.content.getTagsWithContent.invalidate(),
				utils.graph.getGraph.invalidate(),
			]);

			showToast.success("Ссылка сохранена");
			onSuccess(content);
		} catch {
			showToast.error("Ошибка при сохранении ссылки");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col h-full">
			<ModalBody scrollable>
				<div className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="url" className="text-sm font-medium">
							URL *
						</label>
						<div className="flex gap-2">
							<Input
								id="url"
								placeholder="https://example.com"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
								disabled={createMutation.isPending || parsing}
								className="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								onClick={handleParseLink}
								disabled={!url.trim() || parsing || createMutation.isPending}>
								{parsing ? "Обработка..." : "Распознать"}
							</Button>
						</div>
					</div>

					<div className="space-y-2">
						<label htmlFor="title" className="text-sm font-medium">
							Заголовок (необязательно)
						</label>
						<Input
							id="title"
							placeholder="Название ссылки..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							disabled={createMutation.isPending}
						/>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Теги</label>
						<div className="flex flex-wrap gap-2">
							{tags.map((tag) => (
								<Badge key={tag} variant="secondary" className="flex items-center gap-1">
									{tag}
									<button
										type="button"
										onClick={() => handleRemoveTag(tag)}
										className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
										disabled={createMutation.isPending}>
										<X className="w-3 h-3" />
									</button>
								</Badge>
							))}
							<Input
								placeholder="+ Добавить тег"
								value={currentTag}
								onChange={(e) => setCurrentTag(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddTag();
									}
								}}
								className="flex-1 min-w-[120px]"
								disabled={createMutation.isPending}
							/>
						</div>
					</div>
				</div>
			</ModalBody>

			<div className="p-6 pt-4 border-t bg-background flex-shrink-0">
				<ModalActions position="right">
					<Button
						type="button"
						variant="outline"
						onClick={() => onSuccess()}
						disabled={createMutation.isPending}>
						Отмена
					</Button>
					<Button
						type="submit"
						disabled={createMutation.isPending || !url.trim()}
						loading={createMutation.isPending}>
						{createMutation.isPending ? "Сохранение..." : "Сохранить"}
					</Button>
				</ModalActions>
			</div>
		</form>
	);
}
