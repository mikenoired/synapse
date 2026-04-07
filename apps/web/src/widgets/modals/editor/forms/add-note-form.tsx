"use client";

import { Badge, Button, Input } from "@synapse/ui/components";
import { X } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/shared/api/trpc";
import { Editor } from "@/widgets/editor/ui/editor";

import { ModalActions, ModalBody } from "../../layout";
import { showToast } from "../../utils";

interface AddNoteFormProps {
	initialTags?: string[];
	onSuccess: () => void;
	isFullScreen?: boolean;
}

export function AddNoteForm({ initialTags = [], onSuccess, isFullScreen }: AddNoteFormProps) {
	const [title, setTitle] = useState("");
	const [editorData, setEditorData] = useState<any>(null);
	const [tags, setTags] = useState<string[]>(initialTags);
	const [currentTag, setCurrentTag] = useState("");

	const createMutation = trpc.content.create.useMutation();

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

	const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddTag();
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!editorData) {
			showToast.error("Добавьте содержимое заметки");
			return;
		}

		try {
			await createMutation.mutateAsync({
				type: "note",
				title: title || undefined,
				content: JSON.stringify(editorData),
				tags,
			});

			showToast.success("Заметка создана");
			onSuccess();
		} catch {
			showToast.error("Ошибка при создании заметки");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col h-full">
			<div className={`p-6 pb-4 border-b flex-shrink-0 ${isFullScreen ? "bg-background" : ""}`}>
				<div className="max-w-[700px] mx-auto w-full">
					<Input
						id="title"
						placeholder="Заголовок (необязательно)..."
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={createMutation.isPending}
						className="!text-2xl font-bold border-none shadow-none !bg-transparent focus-visible:ring-0 h-auto px-0"
					/>
					<div className="flex flex-wrap gap-2 mt-3">
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
							id="tags"
							placeholder="+ Добавить тег"
							value={currentTag}
							onChange={(e) => setCurrentTag(e.target.value)}
							onKeyDown={handleTagKeyDown}
							className="border-none shadow-none focus-visible:ring-0 h-auto flex-1 min-w-[120px]"
							disabled={createMutation.isPending}
						/>
					</div>
				</div>
			</div>

			<ModalBody scrollable noPadding>
				<div className="p-6 pt-2">
					<div className="max-w-[700px] mx-auto w-full">
						<Editor data={editorData} onChange={setEditorData} readOnly={createMutation.isPending} />
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
						disabled={createMutation.isPending || !editorData}
						loading={createMutation.isPending}>
						{createMutation.isPending ? "Сохранение..." : "Сохранить"}
					</Button>
				</ModalActions>
			</div>
		</form>
	);
}
