"use client";

import { cn } from "@synapse/ui/cn";
import { Input } from "@synapse/ui/components";
import { prose } from "@synapse/ui/prose";
import { Edit2, ListChecks, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Content } from "@/shared/lib/schemas";

import { BaseModal } from "../base";
import { ActionBar } from "../components";
import { useModalKeyboard } from "../hooks";
import { ModalBody, ModalHeader } from "../layout";

interface TodoViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	onUpdate: (newTodos: { text: string; marked: boolean }[]) => void;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

export function TodoViewerModal({
	open,
	onOpenChange,
	item,
	onUpdate,
	onEdit,
	onDelete,
}: TodoViewerModalProps) {
	const [todos, setTodos] = useState<{ text: string; marked: boolean }[]>([]);
	const [changed, setChanged] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useModalKeyboard({
		enabled: open,
		onEscape: () => onOpenChange(false),
	});

	useEffect(() => {
		try {
			setTodos(JSON.parse(item.content));
		} catch {
			setTodos([]);
		}
		setChanged(false);
	}, [item]);

	useEffect(() => {
		if (!changed) return;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			onUpdate(todos);
			setChanged(false);
		}, 300);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [todos, changed, onUpdate]);

	const handleToggle = (idx: number) => {
		setTodos((todos) => todos.map((t, i) => (i === idx ? { ...t, marked: !t.marked } : t)));
		setChanged(true);
	};

	const handleEdit = () => {
		if (onEdit) {
			onEdit(item.id);
			onOpenChange(false);
		}
	};

	const handleDelete = () => {
		if (onDelete) {
			if (confirm("Вы уверены, что хотите удалить этот список?")) onDelete(item.id);

			onOpenChange(false);
		}
	};

	const actions = [
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
		<BaseModal open={open} onOpenChange={onOpenChange} size="lg">
			<div className="flex flex-col h-full max-w-[750px] mx-auto w-full">
				<ModalHeader>
					<div className="space-y-4">
						<ModalHeader.Meta icon={ListChecks} type="Todo List" />

						{item.title && <ModalHeader.Title>{item.title}</ModalHeader.Title>}

						<ModalHeader.Info createdAt={item.created_at} updatedAt={item.updated_at} />

						{item.tags.length > 0 && <ModalHeader.Tags tags={item.tags} />}

						{actions.length > 0 && <ActionBar actions={actions} />}
					</div>
				</ModalHeader>

				<ModalBody>
					<div className={cn("max-w-none", prose)}>
						<div className="flex flex-col gap-3">
							{todos.length === 0 && <div className="text-muted-foreground text-sm">Нет задач</div>}
							{todos.map((todo, idx) => (
								<div key={idx} className="flex items-center gap-2">
									<Input
										type="checkbox"
										checked={todo.marked}
										onChange={() => handleToggle(idx)}
										className="w-5 h-5 cursor-pointer"
									/>
									<span className={todo.marked ? "line-through opacity-60" : ""}>{todo.text}</span>
								</div>
							))}
						</div>
					</div>
				</ModalBody>
			</div>
		</BaseModal>
	);
}
