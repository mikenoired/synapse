import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "@/server/routers/_app";
import type { Content } from "@/shared/lib/schemas";

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

export type ContentListQueryInput = RouterInputs["content"]["getAll"];
export type ContentListQueryResult = RouterOutputs["content"]["getAll"];

function normalizeSearchValue(value?: string): string {
	return value?.trim().toLowerCase() ?? "";
}

function matchesSearch(item: Content, search?: string): boolean {
	const normalizedSearch = normalizeSearchValue(search);

	if (!normalizedSearch) {
		return true;
	}

	const fields = [item.title, item.content, ...item.tags]
		.filter((value): value is string => Boolean(value))
		.map((value) => value.toLowerCase());

	return fields.some((value) => value.includes(normalizedSearch));
}

function matchesTags(item: Content, tagIds?: string[]): boolean {
	if (!tagIds?.length) {
		return true;
	}

	return tagIds.every((tagId) => item.tag_ids.includes(tagId));
}

function matchesType(item: Content, type?: Content["type"]): boolean {
	if (!type) {
		return true;
	}

	return item.type === type;
}

export function matchesContentListFilters(item: Content, input: ContentListQueryInput): boolean {
	return matchesSearch(item, input.search) && matchesTags(item, input.tagIds) && matchesType(item, input.type);
}

function sortByCreatedAtDesc(items: Content[]): Content[] {
	return [...items].sort((left, right) => {
		const leftTime = new Date(left.created_at).getTime();
		const rightTime = new Date(right.created_at).getTime();

		if (leftTime === rightTime) {
			return right.id.localeCompare(left.id);
		}

		return rightTime - leftTime;
	});
}

export function upsertContentInList(
	current: ContentListQueryResult | undefined,
	item: Content,
	input: ContentListQueryInput
): ContentListQueryResult | undefined {
	if (!current) {
		return current;
	}

	const matches = matchesContentListFilters(item, input);
	const nextItems = current.items.filter((entry) => entry.id !== item.id);

	if (!matches) {
		return {
			...current,
			items: nextItems,
		};
	}

	const limit = input.limit ?? current.items.length;
	const items = sortByCreatedAtDesc([item, ...nextItems]).slice(0, limit);

	return {
		...current,
		items,
	};
}

export function removeContentFromList(
	current: ContentListQueryResult | undefined,
	contentId: string
): ContentListQueryResult | undefined {
	if (!current) {
		return current;
	}

	return {
		...current,
		items: current.items.filter((item) => item.id !== contentId),
	};
}
