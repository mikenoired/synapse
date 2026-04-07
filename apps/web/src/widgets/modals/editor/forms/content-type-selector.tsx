"use client";

import { cn } from "@synapse/ui/cn";
import { Button } from "@synapse/ui/components";
import {
	ArrowLeft,
	FileText,
	FileUp,
	Image as ImageIcon,
	Link,
	ListChecks,
	Maximize,
	Minimize,
	Music2,
} from "lucide-react";

import type { Content } from "@/shared/lib/schemas";

interface ContentTypeOption {
	description: string;
	icon: typeof FileText;
	key: Content["type"];
	label: string;
}

export const contentTypeOptions: ContentTypeOption[] = [
	{ key: "note", icon: FileText, label: "Заметка", description: "Быстрые мысли, заметки и длинные тексты" },
	{ key: "media", icon: ImageIcon, label: "Медиа", description: "Изображения и видео для быстрой навигации" },
	{ key: "audio", icon: Music2, label: "Аудио", description: "Файлы, треки и голосовые материалы" },
	{ key: "link", icon: Link, label: "Ссылка", description: "Сохранённые ссылки с превью и метаданными" },
	{ key: "todo", icon: ListChecks, label: "Задачи", description: "Короткие списки дел и контрольные пункты" },
	{
		key: "doc",
		icon: FileUp,
		label: "Документ",
		description: "PDF, DOCX, EPUB, XLSX, CSV и другие документы",
	},
];

export function getContentTypeMeta(type: Content["type"]) {
	return contentTypeOptions.find((option) => option.key === type) ?? contentTypeOptions[0];
}

interface ContentTypePickerProps {
	onSelect: (type: Content["type"]) => void;
	suggestedType?: Content["type"] | null;
}

export function ContentTypePicker({ onSelect, suggestedType }: ContentTypePickerProps) {
	return (
		<div className="flex flex-col gap-6 p-6 sm:p-7">
			<div className="space-y-2">
				<p className="text-sm font-medium text-muted-foreground">Добавление контента</p>
				<h2 className="text-2xl font-semibold text-foreground">Что вы хотите добавить?</h2>
				<p className="max-w-xl text-sm leading-6 text-muted-foreground">
					Сначала выбираем тип содержимого, затем показываем только нужные поля и действия.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{contentTypeOptions.map(({ key, icon: Icon, label, description }) => {
					const isSuggested = suggestedType === key;

					return (
						<button
							key={key}
							type="button"
							onClick={() => onSelect(key)}
							className={cn(
								"group rounded-2xl border border-border bg-card p-4 text-left transition-colors duration-150 hover:border-foreground/20 hover:bg-accent/40",
								isSuggested && "border-primary/40 bg-primary/5"
							)}>
							<div className="flex items-start justify-between gap-3">
								<div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-background">
									<Icon className="size-4.5" />
								</div>
								{isSuggested && (
									<span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
										Подходит
									</span>
								)}
							</div>
							<div className="mt-4 space-y-1">
								<h3 className="text-base font-medium text-foreground">{label}</h3>
								<p className="text-sm leading-6 text-muted-foreground">{description}</p>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

interface ContentTypeHeaderProps {
	type: Content["type"];
	onBack: () => void;
	isFullScreen: boolean;
	onToggleFullScreen: () => void;
}

export function ContentTypeHeader({
	type,
	onBack,
	isFullScreen,
	onToggleFullScreen,
}: ContentTypeHeaderProps) {
	const meta = getContentTypeMeta(type);
	const Icon = meta.icon;

	return (
		<div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
			<div className="flex min-w-0 items-center gap-3">
				<Button variant="ghost" size="sm" onClick={onBack} className="h-9 w-9 p-0">
					<ArrowLeft className="size-4" />
				</Button>
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
						<Icon className="size-4" />
					</div>
					<div className="min-w-0">
						<p className="text-sm font-medium text-foreground">{meta.label}</p>
						<p className="truncate text-xs text-muted-foreground">{meta.description}</p>
					</div>
				</div>
			</div>

			{type === "note" && (
				<Button
					variant="ghost"
					size="sm"
					onClick={onToggleFullScreen}
					className="h-9 gap-2 px-3 text-muted-foreground">
					{isFullScreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
					<span className="hidden sm:inline">{isFullScreen ? "Свернуть" : "На весь экран"}</span>
				</Button>
			)}
		</div>
	);
}
