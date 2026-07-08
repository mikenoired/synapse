"use client";

import { useEffect } from "react";

const textTranslations: Record<string, string> = {
	"Preferences": "Настройки",
	"Issues": "Проблемы",
	"Route": "Маршрут",
	"Route Info": "Информация о маршруте",
	"Static Route": "Статический маршрут",
	"Dynamic Route": "Динамический маршрут",
	"Static": "Статический",
	"Dynamic": "Динамический",
	"Loading": "Загрузка",
	"Loading...": "Загрузка...",
	"Bundler": "Сборщик",
	"Turbopack is enabled.": "Turbopack включен.",
	"Learn about Turbopack and how to enable it in your application.":
		"Подробнее о Turbopack и его включении в приложении.",
	"Learn More": "Подробнее",
	"Cache Components": "Кеш-компоненты",
	"Cache Components is enabled.": "Кеш-компоненты включены.",
	"Enabled": "Включено",
	"Instant Navs": "Мгновенная навигация",
	"Test instant navigation behavior.": "Проверить поведение мгновенной навигации.",

	"Theme": "Тема",
	"Select your theme preference.": "Выберите тему интерфейса.",
	"System": "Системная",
	"Light": "Светлая",
	"Dark": "Темная",
	"Position": "Положение",
	"Adjust the placement of your dev tools.": "Настройте расположение инструментов разработчика.",
	"Bottom Left": "Снизу слева",
	"Bottom Right": "Снизу справа",
	"Top Left": "Сверху слева",
	"Top Right": "Сверху справа",
	"Size": "Размер",
	"Adjust the size of your dev tools.": "Настройте размер инструментов разработчика.",
	"Small": "Маленький",
	"Medium": "Средний",
	"Large": "Большой",

	"Hide Dev Tools for this session": "Скрыть инструменты разработчика на эту сессию",
	"Hide Dev Tools until you restart your dev server, or 1 day.":
		"Скрывает инструменты разработчика до перезапуска dev-сервера или на 1 день.",
	"Hide": "Скрыть",
	"Hide Dev Tools shortcut": "Сочетание клавиш для скрытия инструментов разработчика",
	"Set a custom keyboard shortcut to toggle visibility.":
		"Задайте сочетание клавиш для переключения видимости.",
	"Record Shortcut": "Записать сочетание",
	"Clear shortcut": "Очистить сочетание",
	"Shortcut set": "Сочетание задано",
	"Recording": "Запись",
	"Disable Dev Tools for this project": "Отключить инструменты разработчика для этого проекта",
	"Restart Dev Server": "Перезапустить dev-сервер",
	"Restarts the development server without needing to leave the browser.":
		"Перезапускает dev-сервер прямо из браузера.",
	"Restart": "Перезапустить",
	"Reset Bundler Cache": "Сбросить кеш сборщика",
	"Clears the bundler cache and restarts the dev server. Helpful if you are seeing stale errors or changes are not appearing.":
		"Очищает кеш сборщика и перезапускает dev-сервер. Помогает, если видны устаревшие ошибки или изменения не появляются.",
	"Reset Cache": "Сбросить кеш",

	"Page load": "Загрузка страницы",
	"View the initial static UI for this page.": "Показать начальный статический UI этой страницы.",
	"Reload": "Перезагрузить",
	"Client navigation": "Клиентская навигация",
	"Freeze the next navigation to view the prefetched UI.":
		"Остановить следующую навигацию, чтобы увидеть предварительно загруженный UI.",
	"Start": "Начать",
	"Click any link in your app to view the prefetched UI for that page.":
		"Нажмите любую ссылку в приложении, чтобы увидеть предварительно загруженный UI страницы.",
	"From": "Откуда",
	"From:": "Откуда:",
	"To": "Куда",
	"To:": "Куда:",
	"You're viewing the prefetched UI for the previous navigation to the current URL.":
		"Показан предварительно загруженный UI предыдущего перехода к текущему URL.",
	"You're viewing the pre-rendered static UI for the current URL.":
		"Показан предварительно отрендеренный статический UI для текущего URL.",
	"Continue rendering": "Продолжить рендеринг",
	"Share": "Поделиться",
	"Copied!": "Скопировано!",
};

const attributeNames = ["aria-label", "title"] as const;
const layoutPatchStyleId = "synapse-next-devtools-layout-patch";

const layoutPatchCss = `
.dynamic-panel-container[data-synapse-preferences-panel='true'] {
	width: min(620px, calc(100vw - 32px)) !important;
	height: min(640px, calc(100vh - 32px)) !important;
	min-width: min(560px, calc(100vw - 32px)) !important;
	max-width: calc(100vw - 32px) !important;
	max-height: calc(100vh - 32px) !important;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .panel-content-container,
.dynamic-panel-container[data-synapse-preferences-panel='true'] .draggable-content {
	min-width: 0;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .draggable-content {
	overflow: auto !important;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .user-preferences-wrapper {
	padding: 14px 18px 16px !important;
	overflow: visible !important;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .preferences-container {
	width: 100% !important;
	max-width: none !important;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .preference-section {
	display: grid !important;
	grid-template-columns: minmax(0, 1fr) max-content;
	gap: 10px 16px !important;
	align-items: center !important;
	padding: 10px 0 !important;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .preference-header {
	min-width: 0;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .preference-header label {
	display: block;
	font-size: 13px !important;
	line-height: 1.25 !important;
	overflow-wrap: anywhere;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .preference-description {
	font-size: 12px !important;
	line-height: 1.35 !important;
	overflow-wrap: anywhere;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .preference-control {
	display: flex;
	min-width: 0;
	max-width: 240px;
	justify-content: flex-end;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .select-button,
.dynamic-panel-container[data-synapse-preferences-panel='true'] .action-button,
.dynamic-panel-container[data-synapse-preferences-panel='true'] .shortcut-recorder-button {
	min-height: 32px;
	max-width: 240px;
	justify-content: center;
	white-space: normal;
	text-align: center;
	line-height: 1.2;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .select-button select {
	min-width: 0;
	max-width: 184px;
	overflow: hidden;
	text-overflow: ellipsis;
}

.dynamic-panel-container[data-synapse-preferences-panel='true'] .shortcut-recorder {
	justify-content: flex-end;
	min-width: 0;
}

@media (max-width: 560px) {
	.dynamic-panel-container[data-synapse-preferences-panel='true'] {
		width: calc(100vw - 24px) !important;
		height: min(680px, calc(100vh - 24px)) !important;
		min-width: 0 !important;
	}

	.dynamic-panel-container[data-synapse-preferences-panel='true'] .preference-section {
		grid-template-columns: minmax(0, 1fr);
		align-items: stretch !important;
	}

	.dynamic-panel-container[data-synapse-preferences-panel='true'] .preference-control {
		max-width: none;
		justify-content: flex-start;
	}

	.dynamic-panel-container[data-synapse-preferences-panel='true'] .select-button,
	.dynamic-panel-container[data-synapse-preferences-panel='true'] .action-button,
	.dynamic-panel-container[data-synapse-preferences-panel='true'] .shortcut-recorder-button {
		width: 100%;
		max-width: none;
	}

	.dynamic-panel-container[data-synapse-preferences-panel='true'] .select-button select {
		max-width: none;
	}
}
`;

function withOriginalWhitespace(original: string, translated: string) {
	const leadingWhitespace = original.match(/^\s*/)?.[0] ?? "";
	const trailingWhitespace = original.match(/\s*$/)?.[0] ?? "";

	return `${leadingWhitespace}${translated}${trailingWhitespace}`;
}

function pluralizeIssue(count: number) {
	const remainder10 = count % 10;
	const remainder100 = count % 100;

	if (remainder10 === 1 && remainder100 !== 11) return "проблема";
	if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) return "проблемы";

	return "проблем";
}

function translateTrimmedText(text: string) {
	const exactTranslation = textTranslations[text];
	if (exactTranslation) return exactTranslation;

	const issuesMatch = text.match(/^(\d+) (issue|issues) found\. Click to view details in the dev overlay\.$/);
	if (issuesMatch) {
		const count = Number(issuesMatch[1]);

		return `Найдено ${count} ${pluralizeIssue(count)}. Нажмите, чтобы открыть подробности в панели разработчика.`;
	}

	const routeMatch = text.match(/^Current route is (static|dynamic)\.$/);
	if (routeMatch) {
		return `Текущий маршрут: ${routeMatch[1] === "static" ? "статический" : "динамический"}.`;
	}

	return null;
}

function translateText(text: string) {
	const trimmedText = text.trim();
	if (!trimmedText) return null;

	const translatedText = translateTrimmedText(trimmedText);
	if (!translatedText) return null;

	return withOriginalWhitespace(text, translatedText);
}

function translateTextNodes(root: ParentNode) {
	const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	let currentNode = textWalker.nextNode();

	while (currentNode) {
		const textNode = currentNode as Text;
		const nextValue = translateText(textNode.nodeValue ?? "");

		if (nextValue && nextValue !== textNode.nodeValue) {
			textNode.nodeValue = nextValue;
		}

		currentNode = textWalker.nextNode();
	}
}

function translateElementAttributes(root: ParentNode) {
	for (const element of root.querySelectorAll("*")) {
		for (const attributeName of attributeNames) {
			const attributeValue = element.getAttribute(attributeName);
			if (!attributeValue) continue;

			const nextValue = translateText(attributeValue);
			if (nextValue && nextValue !== attributeValue) {
				element.setAttribute(attributeName, nextValue);
			}
		}
	}
}

function translateCompositeDescriptions(root: ParentNode) {
	for (const description of root.querySelectorAll<HTMLElement>(".preference-description")) {
		const descriptionText = description.textContent?.replace(/\s+/g, " ").trim();

		if (
			descriptionText === "To disable this UI completely, set devIndicators: false in your next.config file."
		) {
			description.innerHTML =
				'Чтобы полностью отключить этот интерфейс, укажите <code class="dev-tools-info-code">devIndicators: false</code> в файле <code class="dev-tools-info-code">next.config</code>.';
		}
	}
}

function applyLayoutPatch(root: ShadowRoot) {
	if (!root.getElementById(layoutPatchStyleId)) {
		const styleElement = document.createElement("style");
		styleElement.id = layoutPatchStyleId;
		styleElement.textContent = layoutPatchCss;
		root.appendChild(styleElement);
	}

	for (const panel of root.querySelectorAll<HTMLElement>("[data-synapse-preferences-panel='true']")) {
		panel.removeAttribute("data-synapse-preferences-panel");
	}

	const preferencesWrapper = root.querySelector(".user-preferences-wrapper");
	const preferencesPanel = preferencesWrapper?.closest<HTMLElement>(".dynamic-panel-container");
	preferencesPanel?.setAttribute("data-synapse-preferences-panel", "true");
}

function translateDevToolsRoot(root: ShadowRoot) {
	applyLayoutPatch(root);
	translateCompositeDescriptions(root);
	translateElementAttributes(root);
	translateTextNodes(root);
}

export function NextDevtoolsLocalizer() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") return;

		const observedRoots = new WeakSet<ShadowRoot>();
		const observers: MutationObserver[] = [];

		function observeRoot(root: ShadowRoot) {
			if (observedRoots.has(root)) return;

			observedRoots.add(root);

			let frameId = 0;
			const scheduleTranslation = () => {
				if (frameId) return;

				frameId = window.requestAnimationFrame(() => {
					frameId = 0;
					translateDevToolsRoot(root);
				});
			};

			const rootObserver = new MutationObserver(scheduleTranslation);
			rootObserver.observe(root, {
				attributeFilter: [...attributeNames],
				attributes: true,
				characterData: true,
				childList: true,
				subtree: true,
			});
			observers.push(rootObserver);
			scheduleTranslation();
		}

		function scanForDevToolsPortals() {
			for (const portal of document.querySelectorAll<HTMLElement>("nextjs-portal")) {
				if (portal.shadowRoot) observeRoot(portal.shadowRoot);
			}
		}

		const bodyObserver = new MutationObserver(scanForDevToolsPortals);
		bodyObserver.observe(document.body, { childList: true, subtree: true });
		observers.push(bodyObserver);

		scanForDevToolsPortals();

		return () => {
			for (const observer of observers) {
				observer.disconnect();
			}
		};
	}, []);

	return null;
}
