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
		<div className="flex h-full flex-col">
			<div className="border-b p-6 pb-4">
				<div className="mx-auto w-full max-w-[700px]">
					<Input
						id="title"
						placeholder="Title (optional)..."
						value={title}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTitle(e.target.value)}
						disabled={isSubmitting}
						className="h-auto border-none bg-transparent! px-0 text-2xl! font-bold shadow-none focus-visible:ring-0"
					/>
					<div className="mt-3">
						<TagEditor
							tags={tags}
							onTagsChange={setTags}
							disabled={isSubmitting}
							inputClassName="border-none shadow-none focus-visible:ring-0 h-auto flex-1"
							placeholder="+ Add tag"
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

			<div className="flex-1 overflow-y-auto p-6 pt-2">
				<div className="mx-auto w-full max-w-[700px]">
					<Editor data={editorData} onChange={setEditorData} readOnly={isSubmitting} />
				</div>
			</div>
		</div>
	);
}
