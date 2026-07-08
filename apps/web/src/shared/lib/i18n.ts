"use client";

import { useCallback } from "react";

import { useUserPreferences } from "./user-preferences-context";

export type TranslationKey =
	| "add"
	| "addContent"
	| "addFirstContent"
	| "addContent.eyebrow"
	| "addContent.title"
	| "addTag"
	| "addContent.description"
	| "audio"
	| "autoplay.description"
	| "autoplay.title"
	| "cancel"
	| "clearFilters"
	| "contentType.audio.description"
	| "contentType.doc.description"
	| "contentType.link.description"
	| "contentType.media.description"
	| "contentType.note.description"
	| "contentType.todo.description"
	| "createdWithUs"
	| "dashboard.drop.title"
	| "dashboard.drop.subtitle"
	| "details"
	| "delete"
	| "done"
	| "documents"
	| "edit"
	| "emptyNote"
	| "empty.description"
	| "empty.title"
	| "files"
	| "filter.types.active"
	| "filter.types.show"
	| "general"
	| "generateTags"
	| "generatingTags"
	| "graph"
	| "home"
	| "language"
	| "language.description"
	| "language.english"
	| "language.russian"
	| "link"
	| "media"
	| "mediaStorage"
	| "noDate"
	| "notFound.description"
	| "notFound.title"
	| "note"
	| "open"
	| "position.collapse"
	| "position.expand"
	| "save"
	| "saving"
	| "search.aria"
	| "search.placeholder"
	| "settings"
	| "settings.close"
	| "settings.description"
	| "settings.sidebar.collapse"
	| "settings.sidebar.expand"
	| "settings.title"
	| "session.description"
	| "session.signingOut"
	| "session.signOut"
	| "session.title"
	| "storage.local"
	| "storage.used"
	| "suitable"
	| "tags"
	| "todo"
	| "untitled"
	| "view.fullscreen"
	| "view.windowed";

type TranslationMap = Record<TranslationKey, string>;

const translations: Record<"ru" | "en", TranslationMap> = {
	ru: {
		"add": "Добавить",
		"addContent": "Добавить материал",
		"addFirstContent": "Добавьте первую заметку, документ или медиафайл.",
		"addContent.eyebrow": "Добавление контента",
		"addContent.title": "Что вы хотите добавить?",
		"addTag": "+ Добавить тег",
		"addContent.description":
			"Сначала выбираем тип содержимого, затем показываем только нужные поля и действия.",
		"audio": "Аудио",
		"autoplay.description": "Автоматически запускает аудио и видео сразу после открытия в просмотрщике.",
		"autoplay.title": "Автовоспроизведение",
		"cancel": "Отмена",
		"clearFilters": "Сбросить фильтры",
		"contentType.audio.description": "Файлы, треки и голосовые материалы",
		"contentType.doc.description": "PDF, DOCX, EPUB, XLSX, CSV и другие документы",
		"contentType.link.description": "Сохранённые ссылки с превью и метаданными",
		"contentType.media.description": "Изображения и видео для быстрой навигации",
		"contentType.note.description": "Быстрые мысли, заметки и длинные тексты",
		"contentType.todo.description": "Короткие списки дел и контрольные пункты",
		"createdWithUs": "С нами с {date}",
		"dashboard.drop.title": "Перетащите файлы, чтобы добавить контент",
		"dashboard.drop.subtitle": "Поддерживаются изображения, видео, аудио и документы",
		"details": "Детали",
		"delete": "Удалить",
		"done": "выполнено",
		"documents": "Документ",
		"edit": "Редактировать",
		"emptyNote": "Пустая заметка",
		"empty.description": "Добавьте первую заметку, документ или медиафайл.",
		"empty.title": "Здесь пока пусто",
		"files": "Файлов",
		"filter.types.active": "Фильтрация по типам включена",
		"filter.types.show": "Показать фильтры по типам",
		"general": "Основное",
		"generateTags": "AI-теги",
		"generatingTags": "Генерация…",
		"graph": "Связи",
		"home": "Главная",
		"language": "Язык интерфейса",
		"language.description": "Выберите язык подписей, меню и основных экранов приложения.",
		"language.english": "English",
		"language.russian": "Русский",
		"link": "Ссылка",
		"media": "Медиа",
		"mediaStorage": "Хранилище",
		"noDate": "Дата недоступна",
		"notFound.description": "Измените запрос или сбросьте фильтры.",
		"notFound.title": "Ничего не найдено",
		"note": "Заметка",
		"open": "Открыть",
		"position.collapse": "Свернуть",
		"position.expand": "Развернуть",
		"save": "Сохранить",
		"saving": "Сохранение...",
		"search.aria": "Поиск по материалам",
		"search.placeholder": "Поиск по названию и содержимому",
		"settings": "Настройки",
		"settings.close": "Закрыть настройки",
		"settings.description": "Параметры аккаунта, хранилища и воспроизведения.",
		"settings.sidebar.collapse": "Свернуть боковую панель",
		"settings.sidebar.expand": "Развернуть боковую панель",
		"settings.title": "Настройки",
		"session.description": "Завершить работу на этом устройстве.",
		"session.signingOut": "Выходим…",
		"session.signOut": "Выйти",
		"session.title": "Текущая сессия",
		"storage.local": "Локальное хранилище",
		"storage.used": "Использовано",
		"suitable": "Подходит",
		"tags": "Теги",
		"todo": "Задачи",
		"untitled": "Без названия",
		"view.fullscreen": "На весь экран",
		"view.windowed": "Свернуть",
	},
	en: {
		"add": "Add",
		"addContent": "Add content",
		"addFirstContent": "Add your first note, document, or media file.",
		"addContent.eyebrow": "Add content",
		"addContent.title": "What do you want to add?",
		"addTag": "+ Add tag",
		"addContent.description":
			"Choose a content type first, then only the relevant fields and actions appear.",
		"audio": "Audio",
		"autoplay.description": "Automatically starts audio and video when opened in the viewer.",
		"autoplay.title": "Autoplay",
		"cancel": "Cancel",
		"clearFilters": "Clear filters",
		"contentType.audio.description": "Files, tracks, and voice materials",
		"contentType.doc.description": "PDF, DOCX, EPUB, XLSX, CSV, and other documents",
		"contentType.link.description": "Saved links with previews and metadata",
		"contentType.media.description": "Images and videos for quick browsing",
		"contentType.note.description": "Quick thoughts, notes, and long-form text",
		"contentType.todo.description": "Short todo lists and checkpoints",
		"createdWithUs": "Member since {date}",
		"dashboard.drop.title": "Drop files to add content",
		"dashboard.drop.subtitle": "Images, video, audio, and documents are supported",
		"details": "Details",
		"delete": "Delete",
		"done": "done",
		"documents": "Document",
		"edit": "Edit",
		"emptyNote": "Empty note",
		"empty.description": "Add your first note, document, or media file.",
		"empty.title": "Nothing here yet",
		"files": "Files",
		"filter.types.active": "Content type filters are active",
		"filter.types.show": "Show content type filters",
		"general": "General",
		"generateTags": "AI tags",
		"generatingTags": "Generating…",
		"graph": "Graph",
		"home": "Home",
		"language": "Interface language",
		"language.description": "Choose the language for labels, menus, and main app screens.",
		"language.english": "English",
		"language.russian": "Русский",
		"link": "Link",
		"media": "Media",
		"mediaStorage": "Storage",
		"noDate": "Date unavailable",
		"notFound.description": "Change the query or clear filters.",
		"notFound.title": "Nothing found",
		"note": "Note",
		"open": "Open",
		"position.collapse": "Collapse",
		"position.expand": "Expand",
		"save": "Save",
		"saving": "Saving...",
		"search.aria": "Search content",
		"search.placeholder": "Search by title and content",
		"settings": "Settings",
		"settings.close": "Close settings",
		"settings.description": "Account, storage, and playback preferences.",
		"settings.sidebar.collapse": "Collapse sidebar",
		"settings.sidebar.expand": "Expand sidebar",
		"settings.title": "Settings",
		"session.description": "End work on this device.",
		"session.signingOut": "Signing out…",
		"session.signOut": "Sign out",
		"session.title": "Current session",
		"storage.local": "Local storage",
		"storage.used": "Used",
		"suitable": "Suggested",
		"tags": "Tags",
		"todo": "Tasks",
		"untitled": "Untitled",
		"view.fullscreen": "Full screen",
		"view.windowed": "Collapse",
	},
};

export function useI18n() {
	const { interfaceLanguage } = useUserPreferences();

	const t = useCallback(
		(key: TranslationKey, replacements?: Record<string, string | number>) => {
			let value = translations[interfaceLanguage][key] ?? translations.ru[key] ?? key;

			if (replacements) {
				for (const [name, replacement] of Object.entries(replacements)) {
					value = value.replaceAll(`{${name}}`, String(replacement));
				}
			}

			return value;
		},
		[interfaceLanguage]
	);

	return {
		interfaceLanguage,
		locale: interfaceLanguage === "ru" ? "ru-RU" : "en-US",
		t,
	};
}
