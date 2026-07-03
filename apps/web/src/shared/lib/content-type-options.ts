import {
	FileText,
	FileUp,
	Image as ImageIcon,
	Link,
	ListChecks,
	type LucideIcon,
	Music2,
} from "lucide-react";

import type { Content } from "@/shared/lib/schemas";

interface ContentTypeOption {
	description: string;
	icon: LucideIcon;
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

export const documentContentTypes: Content["type"][] = ["doc", "pdf", "docx", "epub", "xlsx", "csv"];

export function getQueryTypesForFilter(type: Content["type"]) {
	return type === "doc" ? documentContentTypes : [type];
}

export function isContentTypeFilterAvailable(type: Content["type"], availableTypes: Content["type"][]) {
	return getQueryTypesForFilter(type).some((queryType) => availableTypes.includes(queryType));
}

export function getContentTypeMeta(type: Content["type"]) {
	return contentTypeOptions.find((option) => option.key === type) ?? contentTypeOptions[0];
}
