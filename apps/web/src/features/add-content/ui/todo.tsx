import { Input } from "@synapse/ui/components";

import { TagEditor } from "@/shared/ui/tag-editor";

import { useAddContent } from "../model/add-content-context";
import { TodoList } from "./components/todo-list";

export default function AddTodoView() {
	const {
		formState: { title },
		updateTitle,
		isSubmitting,
		tags,
		todoItems,
		setTags,
		addTodo,
		removeTodo,
		toggleTodo,
		updateTodoText,
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
								type: "todo",
								title,
								content: JSON.stringify(todoItems),
								disabled: todoItems.length === 0,
							}}
						/>
					</div>
				</div>
			</div>
			<div className="flex-1 overflow-y-auto p-6 pt-2">
				<div className="mx-auto w-full max-w-[700px]">
					<TodoList
						items={todoItems}
						isLoading={isSubmitting}
						onAddTodo={addTodo}
						onRemoveTodo={removeTodo}
						onToggleTodo={toggleTodo}
						onUpdateTodoText={updateTodoText}
					/>
				</div>
			</div>
		</div>
	);
}
