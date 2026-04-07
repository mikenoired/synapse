import type { ReadonlyURLSearchParams } from "next/navigation";

import {
	DEFAULT_SETTINGS_TAB,
	LEGACY_SETTINGS_QUERY_PARAM,
	type SettingsTabKey,
	SETTINGS_QUERY_PARAM,
} from "../model/settings-tabs";

type SearchParamsInput = ReadonlyURLSearchParams | URLSearchParams | null;

function cloneSearchParams(searchParams: SearchParamsInput) {
	return new URLSearchParams(searchParams?.toString() ?? "");
}

function formatHref(pathname: string, searchParams: URLSearchParams) {
	const query = searchParams.toString();
	return query ? `${pathname}?${query}` : pathname;
}

export function getSettingsHref(
	pathname: string,
	searchParams: SearchParamsInput,
	tab: SettingsTabKey = DEFAULT_SETTINGS_TAB
) {
	const nextSearchParams = cloneSearchParams(searchParams);
	nextSearchParams.delete(LEGACY_SETTINGS_QUERY_PARAM);
	nextSearchParams.set(SETTINGS_QUERY_PARAM, tab);
	return formatHref(pathname, nextSearchParams);
}

export function getSettingsCloseHref(pathname: string, searchParams: SearchParamsInput) {
	const nextSearchParams = cloneSearchParams(searchParams);
	nextSearchParams.delete(SETTINGS_QUERY_PARAM);
	nextSearchParams.delete(LEGACY_SETTINGS_QUERY_PARAM);
	return formatHref(pathname, nextSearchParams);
}

export function getSidebarRouteHref(pathname: string, targetPath: string, searchParams: SearchParamsInput) {
	if (pathname !== targetPath) {
		return targetPath;
	}

	return getSettingsCloseHref(pathname, searchParams);
}
