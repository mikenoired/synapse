"use client";

import { Badge, Button, Input } from "@synapse/ui/components";
import { Plus, X } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/shared/api/trpc";
import type { Content } from "@/shared/lib/schemas";

import { ModalActions, ModalBody } from "../../layout";
import { showToast } from "../../utils";

interface AddTodoFormProps {
	initialTags?: string[];
	onSuccess: (content?: Content) => void;
}

export function AddTodoForm({ initialTags = [], onSuccess }: AddTodoFormProps) {
	const [title, setTitle] = useState("");
	const [tags, setTags] = useState<string[]>(initialTags);
	const [currentTag, setCurrentTag] = useState("");
	const [todos, setTodos] = useState<{ text: string; marked: boolean }[]>([{ text: "", marked: false }]);
	const [currentTodo, setCurrentTodo] = useState("");
	const utils = trpc.useUtils();

	const createMutation = trpc.content.create.useMutation();

	const handleAddTodo = () => {
		if (currentTodo.trim()) {
			setTodos([...todos, { text: currentTodo.trim(), marked: false }]);
			setCurrentTodo("");
		}
	};

	const handleRemoveTodo = (index: number) => {
		setTodos(todos.filter((_, i) => i !== index));
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

		const validTodos = todos.filter((t) => t.text.trim());
		if (validTodos.length === 0) {
			showToast.error("Добавьте хотя бы одну задачу");
			return;
		}

		try {
			const content = await createMutation.mutateAsync({
				type: "todo",
				title: title || undefined,
				content: JSON.stringify(validTodos),
				tags,
			});

			void Promise.all([
				utils.content.getTags.invalidate(),
				utils.content.getTagsWithContent.invalidate(),
				utils.graph.getGraph.invalidate(),
			]);

			showToast.success("Список задач создан");
			onSuccess(content);
		} catch {
			showToast.error("Ошибка при создании списка");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col h-full">
			<ModalBody scrollable>
				<div className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="title" className="text-sm font-medium">
							Заголовок
						</label>
						<Input
							id="title"
							placeholder="Название списка..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							disabled={createMutation.isPending}
						/>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium">Задачи</label>
						{todos.map((todo, index) => (
							<div key={index} className="flex items-center gap-2">
								<Input
									value={todo.text}
									onChange={(e) => {
										const newTodos = [...todos];
										newTodos[index].text = e.target.value;
										setTodos(newTodos);
									}}
									placeholder="Задача..."
									disabled={createMutation.isPending}
								/>
								<button
									type="button"
									onClick={() => handleRemoveTodo(index)}
									className="p-2 hover:bg-destructive/20 rounded transition-colors"
									disabled={createMutation.isPending}>
									<X className="w-4 h-4" />
								</button>
							</div>
						))}
						<div className="flex gap-2">
							<Input
								placeholder="Добавить задачу..."
								value={currentTodo}
								onChange={(e) => setCurrentTodo(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAddTodo();
									}
								}}
								disabled={createMutation.isPending}
							/>
							<Button
								type="button"
								onClick={handleAddTodo}
								disabled={!currentTodo.trim() || createMutation.isPending}
								variant="outline">
								<Plus className="w-4 h-4" />
							</Button>
						</div>
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
						disabled={createMutation.isPending || todos.filter((t) => t.text.trim()).length === 0}
						loading={createMutation.isPending}>
						{createMutation.isPending ? "Сохранение..." : "Сохранить"}
					</Button>
				</ModalActions>
			</div>
		</form>
	);
}
