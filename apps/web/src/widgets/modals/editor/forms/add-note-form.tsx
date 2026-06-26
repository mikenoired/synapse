"use client";

import { Button, Input } from "@synapse/ui/components";
import { useState } from "react";

import { trpc } from "@/shared/api/trpc";
import type { Content } from "@/shared/lib/schemas";
import { TagEditor } from "@/shared/ui/tag-editor";
import { Editor } from "@/widgets/editor/ui/editor";

import { ModalActions, ModalBody } from "../../layout";
import { showToast } from "../../utils";

interface AddNoteFormProps {
	initialTags?: string[];
	onSuccess: (content?: Content) => void;
	isFullScreen?: boolean;
}

export function AddNoteForm({ initialTags = [], onSuccess, isFullScreen }: AddNoteFormProps) {
	const [title, setTitle] = useState("");
	const [editorData, setEditorData] = useState<any>(null);
	const [tags, setTags] = useState<string[]>(initialTags);
	const utils = trpc.useUtils();

	const createMutation = trpc.content.create.useMutation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!editorData) {
			showToast.error("Добавьте содержимое заметки");
			return;
		}

		try {
			const content = await createMutation.mutateAsync({
				type: "note",
				title: title || undefined,
				content: JSON.stringify(editorData),
				tags,
			});

			void Promise.all([
				utils.content.getTags.invalidate(),
				utils.content.getTagsWithContent.invalidate(),
				utils.graph.getGraph.invalidate(),
			]);

			showToast.success("Заметка создана");
			onSuccess(content);
		} catch {
			showToast.error("Ошибка при создании заметки");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
			<div className={`px-6 pt-8 pb-4 flex-shrink-0 ${isFullScreen ? "bg-background" : ""}`}>
				<div className="max-w-3xl mx-auto w-full">
					<Input
						id="title"
						placeholder="Заголовок заметки"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						disabled={createMutation.isPending}
						className="!text-3xl font-semibold tracking-tight border-none shadow-none !bg-transparent focus-visible:ring-0 h-auto px-0"
					/>
					<div className="mt-3">
						<TagEditor
							tags={tags}
							onTagsChange={setTags}
							disabled={createMutation.isPending}
							inputClassName="border-none shadow-none focus-visible:ring-0 h-auto flex-1 min-w-[120px]"
							aiGenerate={{
								mode: "draft",
								type: "note",
								title,
								content: JSON.stringify(editorData ?? { type: "doc", content: [] }),
								disabled: !editorData,
							}}
						/>
					</div>
				</div>
			</div>

			<ModalBody scrollable noPadding className="min-h-0">
				<div className="px-6 pb-8">
					<div className="max-w-3xl mx-auto w-full">
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
