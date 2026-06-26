"use client";

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
		<div className="flex flex-col h-full">
			<div className="p-6 pb-4 border-b">
				<div className="max-w-[700px] mx-auto w-full">
					<Input
						id="title"
						placeholder="Title (optional)..."
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
			<div className="flex-1 p-6 pt-2 overflow-y-auto">
				<div className="max-w-[700px] mx-auto w-full">
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
