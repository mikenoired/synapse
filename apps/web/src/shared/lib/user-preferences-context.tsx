"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { trpc } from "@/shared/api/trpc";
import { useAuth } from "@/shared/lib/auth-context";

import {
	DEFAULT_USER_PREFERENCES,
	type InterfaceLanguage,
	normalizeUserPreferences,
} from "./user-preferences";

interface UserPreferencesContextValue {
	autoTagColorEnabled: boolean;
	interfaceLanguage: InterfaceLanguage;
	isReady: boolean;
	mediaAutoplayEnabled: boolean;
	noteSparklesEnabled: boolean;
	setAutoTagColorEnabled: (value: boolean) => void;
	setInterfaceLanguage: (value: InterfaceLanguage) => void;
	setMediaAutoplayEnabled: (value: boolean) => void;
	setNoteSparklesEnabled: (value: boolean) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);
const languageStorageKey = "synapse-interface-language";

function getStoredInterfaceLanguage() {
	if (typeof window === "undefined") return DEFAULT_USER_PREFERENCES.interfaceLanguage;

	const storedLanguage = window.localStorage.getItem(languageStorageKey);

	return storedLanguage === "en" || storedLanguage === "ru"
		? storedLanguage
		: DEFAULT_USER_PREFERENCES.interfaceLanguage;
}

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
	const utils = trpc.useUtils();
	const { user } = useAuth();
	const [isReady, setIsReady] = useState(false);
	const [autoTagColorEnabled, setAutoTagColorEnabledState] = useState(
		DEFAULT_USER_PREFERENCES.autoTagColorEnabled
	);
	const [interfaceLanguage, setInterfaceLanguageState] = useState<InterfaceLanguage>(
		DEFAULT_USER_PREFERENCES.interfaceLanguage
	);
	const [mediaAutoplayEnabled, setMediaAutoplayEnabledState] = useState(
		DEFAULT_USER_PREFERENCES.mediaAutoplayEnabled
	);
	const [noteSparklesEnabled, setNoteSparklesEnabledState] = useState(
		DEFAULT_USER_PREFERENCES.noteSparklesEnabled
	);

	const preferencesQuery = trpc.user.getPreferences.useQuery(undefined, {
		enabled: Boolean(user),
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnWindowFocus: false,
	});

	const updatePreferencesMutation = trpc.user.updatePreferences.useMutation();

	useEffect(() => {
		if (!user) {
			setAutoTagColorEnabledState(DEFAULT_USER_PREFERENCES.autoTagColorEnabled);
			setInterfaceLanguageState(getStoredInterfaceLanguage());
			setMediaAutoplayEnabledState(DEFAULT_USER_PREFERENCES.mediaAutoplayEnabled);
			setNoteSparklesEnabledState(DEFAULT_USER_PREFERENCES.noteSparklesEnabled);
			setIsReady(true);
			return;
		}

		if (preferencesQuery.data) {
			const preferences = normalizeUserPreferences(preferencesQuery.data);
			setAutoTagColorEnabledState(preferences.autoTagColorEnabled);
			setInterfaceLanguageState(preferences.interfaceLanguage);
			setMediaAutoplayEnabledState(preferences.mediaAutoplayEnabled);
			setNoteSparklesEnabledState(preferences.noteSparklesEnabled);
			setIsReady(true);
			return;
		}

		if (preferencesQuery.error) {
			setAutoTagColorEnabledState(DEFAULT_USER_PREFERENCES.autoTagColorEnabled);
			setInterfaceLanguageState(getStoredInterfaceLanguage());
			setMediaAutoplayEnabledState(DEFAULT_USER_PREFERENCES.mediaAutoplayEnabled);
			setNoteSparklesEnabledState(DEFAULT_USER_PREFERENCES.noteSparklesEnabled);
			setIsReady(true);
			return;
		}

		setIsReady(false);
	}, [preferencesQuery.data, preferencesQuery.error, user]);

	useEffect(() => {
		document.documentElement.lang = interfaceLanguage;
		window.localStorage.setItem(languageStorageKey, interfaceLanguage);
	}, [interfaceLanguage]);

	const setInterfaceLanguage = useCallback(
		(value: InterfaceLanguage) => {
			const previousPreferences = normalizeUserPreferences({
				autoTagColorEnabled,
				interfaceLanguage,
				mediaAutoplayEnabled,
				noteSparklesEnabled,
			});
			const nextPreferences = normalizeUserPreferences({ ...previousPreferences, interfaceLanguage: value });
			setInterfaceLanguageState(nextPreferences.interfaceLanguage);

			if (!user) {
				return;
			}

			utils.user.getPreferences.setData(undefined, nextPreferences);

			updatePreferencesMutation.mutate(
				{ interfaceLanguage: value },
				{
					onError: () => {
						setInterfaceLanguageState(previousPreferences.interfaceLanguage);
						utils.user.getPreferences.setData(undefined, previousPreferences);
						toast.error(
							previousPreferences.interfaceLanguage === "ru"
								? "Не удалось сохранить язык интерфейса"
								: "Failed to save interface language"
						);
					},
					onSuccess: (preferences) => {
						const normalizedPreferences = normalizeUserPreferences(preferences);
						setAutoTagColorEnabledState(normalizedPreferences.autoTagColorEnabled);
						setInterfaceLanguageState(normalizedPreferences.interfaceLanguage);
						setMediaAutoplayEnabledState(normalizedPreferences.mediaAutoplayEnabled);
						setNoteSparklesEnabledState(normalizedPreferences.noteSparklesEnabled);
						utils.user.getPreferences.setData(undefined, normalizedPreferences);
					},
				}
			);
		},
		[
			autoTagColorEnabled,
			interfaceLanguage,
			mediaAutoplayEnabled,
			noteSparklesEnabled,
			updatePreferencesMutation,
			user,
			utils,
		]
	);

	const setMediaAutoplayEnabled = useCallback(
		(value: boolean) => {
			const previousPreferences = normalizeUserPreferences({
				autoTagColorEnabled,
				interfaceLanguage,
				mediaAutoplayEnabled,
				noteSparklesEnabled,
			});
			const nextPreferences = normalizeUserPreferences({
				...previousPreferences,
				mediaAutoplayEnabled: value,
			});
			setMediaAutoplayEnabledState(nextPreferences.mediaAutoplayEnabled);

			if (!user) {
				return;
			}

			utils.user.getPreferences.setData(undefined, nextPreferences);

			updatePreferencesMutation.mutate(
				{ mediaAutoplayEnabled: value },
				{
					onError: () => {
						setMediaAutoplayEnabledState(previousPreferences.mediaAutoplayEnabled);
						utils.user.getPreferences.setData(undefined, previousPreferences);
						toast.error(
							interfaceLanguage === "ru"
								? "Не удалось сохранить настройку автоплея"
								: "Failed to save autoplay setting"
						);
					},
					onSuccess: (preferences) => {
						const normalizedPreferences = normalizeUserPreferences(preferences);
						setAutoTagColorEnabledState(normalizedPreferences.autoTagColorEnabled);
						setInterfaceLanguageState(normalizedPreferences.interfaceLanguage);
						setMediaAutoplayEnabledState(normalizedPreferences.mediaAutoplayEnabled);
						setNoteSparklesEnabledState(normalizedPreferences.noteSparklesEnabled);
						utils.user.getPreferences.setData(undefined, normalizedPreferences);
					},
				}
			);
		},
		[
			autoTagColorEnabled,
			interfaceLanguage,
			mediaAutoplayEnabled,
			noteSparklesEnabled,
			updatePreferencesMutation,
			user,
			utils,
		]
	);

	const setNoteSparklesEnabled = useCallback(
		(value: boolean) => {
			const previousPreferences = normalizeUserPreferences({
				autoTagColorEnabled,
				interfaceLanguage,
				mediaAutoplayEnabled,
				noteSparklesEnabled,
			});
			const nextPreferences = normalizeUserPreferences({
				...previousPreferences,
				noteSparklesEnabled: value,
			});
			setNoteSparklesEnabledState(nextPreferences.noteSparklesEnabled);

			if (!user) return;

			utils.user.getPreferences.setData(undefined, nextPreferences);

			updatePreferencesMutation.mutate(
				{ noteSparklesEnabled: value },
				{
					onError: () => {
						setNoteSparklesEnabledState(previousPreferences.noteSparklesEnabled);
						utils.user.getPreferences.setData(undefined, previousPreferences);
						toast.error(
							interfaceLanguage === "ru"
								? "Не удалось сохранить настройку эффекта заметок"
								: "Failed to save note effect setting"
						);
					},
					onSuccess: (preferences) => {
						const normalizedPreferences = normalizeUserPreferences(preferences);
						setAutoTagColorEnabledState(normalizedPreferences.autoTagColorEnabled);
						setInterfaceLanguageState(normalizedPreferences.interfaceLanguage);
						setMediaAutoplayEnabledState(normalizedPreferences.mediaAutoplayEnabled);
						setNoteSparklesEnabledState(normalizedPreferences.noteSparklesEnabled);
						utils.user.getPreferences.setData(undefined, normalizedPreferences);
					},
				}
			);
		},
		[
			autoTagColorEnabled,
			interfaceLanguage,
			mediaAutoplayEnabled,
			noteSparklesEnabled,
			updatePreferencesMutation,
			user,
			utils,
		]
	);

	const setAutoTagColorEnabled = useCallback(
		(value: boolean) => {
			const previousPreferences = normalizeUserPreferences({
				autoTagColorEnabled,
				interfaceLanguage,
				mediaAutoplayEnabled,
				noteSparklesEnabled,
			});
			const nextPreferences = normalizeUserPreferences({
				...previousPreferences,
				autoTagColorEnabled: value,
			});
			setAutoTagColorEnabledState(value);

			if (!user) return;

			utils.user.getPreferences.setData(undefined, nextPreferences);
			updatePreferencesMutation.mutate(
				{ autoTagColorEnabled: value },
				{
					onError: () => {
						setAutoTagColorEnabledState(previousPreferences.autoTagColorEnabled);
						utils.user.getPreferences.setData(undefined, previousPreferences);
						toast.error(
							interfaceLanguage === "ru"
								? "Не удалось сохранить настройку цветов тегов"
								: "Failed to save tag color setting"
						);
					},
					onSuccess: (preferences) => {
						const normalizedPreferences = normalizeUserPreferences(preferences);
						setAutoTagColorEnabledState(normalizedPreferences.autoTagColorEnabled);
						setInterfaceLanguageState(normalizedPreferences.interfaceLanguage);
						setMediaAutoplayEnabledState(normalizedPreferences.mediaAutoplayEnabled);
						setNoteSparklesEnabledState(normalizedPreferences.noteSparklesEnabled);
						utils.user.getPreferences.setData(undefined, normalizedPreferences);
					},
				}
			);
		},
		[
			autoTagColorEnabled,
			interfaceLanguage,
			mediaAutoplayEnabled,
			noteSparklesEnabled,
			updatePreferencesMutation,
			user,
			utils,
		]
	);

	const value = useMemo(
		() => ({
			autoTagColorEnabled,
			interfaceLanguage,
			isReady,
			mediaAutoplayEnabled,
			noteSparklesEnabled,
			setAutoTagColorEnabled,
			setInterfaceLanguage,
			setMediaAutoplayEnabled,
			setNoteSparklesEnabled,
		}),
		[
			autoTagColorEnabled,
			interfaceLanguage,
			isReady,
			mediaAutoplayEnabled,
			noteSparklesEnabled,
			setAutoTagColorEnabled,
			setInterfaceLanguage,
			setMediaAutoplayEnabled,
			setNoteSparklesEnabled,
		]
	);

	return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences() {
	const context = useContext(UserPreferencesContext);

	if (!context) {
		throw new Error("useUserPreferences must be used within a UserPreferencesProvider");
	}

	return context;
}
