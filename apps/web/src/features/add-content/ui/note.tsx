"use client";

import { Input } from "@synapse/ui/components";

import { TagEditor } from "@/shared/ui/tag-editor";
import { Editor } from "@/widgets/editor/ui/editor";

import { useAddContent } from "../model/add-content-context";

export default function AddNoteView() {
	const {
		formState: { title },
		updateTitle,
		isSubmitting,
		tags,
		editorData,
		setEditorData,
		setTags,
	} = useAddContent();

	return (
		<div className="flex flex-col h-full">
			<div className="p-6 pb-4 border-b">
				<div className="max-w-[700px] mx-auto w-full">
					<Input
						id="title"
						placeholder="Заголовок (необязательно)..."
						value={title}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTitle(e.target.value)}
						disabled={isSubmitting}
						className="!text-2xl font-bold border-none shadow-none !bg-transparent focus-visible:ring-0 h-auto px-0"
					/>
					<div className="mt-3">
						<TagEditor
							tags={tags}
							onTagsChange={setTags}
							disabled={isSubmitting}
							inputClassName="border-none shadow-none focus-visible:ring-0 h-auto flex-1"
							placeholder="+ Добавить тег"
							aiGenerate={{
								mode: "draft",
								type: "note",
								title,
								content: JSON.stringify(editorData ?? { type: "doc", content: [] }),
								disabled: !editorData?.content?.length,
							}}
						/>
					</div>
				</div>
			</div>

			<div className="flex-1 p-6 pt-2 overflow-y-auto">
				<div className="max-w-[700px] mx-auto w-full">
					<Editor data={editorData} onChange={setEditorData} readOnly={isSubmitting} />
				</div>
			</div>
		</div>
	);
}
