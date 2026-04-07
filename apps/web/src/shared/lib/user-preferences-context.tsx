"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { trpc } from "@/shared/api/trpc";
import { useAuth } from "@/shared/lib/auth-context";

import { DEFAULT_USER_PREFERENCES } from "./user-preferences";

interface UserPreferencesContextValue {
	isReady: boolean;
	mediaAutoplayEnabled: boolean;
	setMediaAutoplayEnabled: (value: boolean) => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
	const utils = trpc.useUtils();
	const { user } = useAuth();
	const [isReady, setIsReady] = useState(false);
	const [mediaAutoplayEnabled, setMediaAutoplayEnabledState] = useState(
		DEFAULT_USER_PREFERENCES.mediaAutoplayEnabled
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
			setMediaAutoplayEnabledState(DEFAULT_USER_PREFERENCES.mediaAutoplayEnabled);
			setIsReady(true);
			return;
		}

		if (preferencesQuery.data) {
			setMediaAutoplayEnabledState(preferencesQuery.data.mediaAutoplayEnabled);
			setIsReady(true);
			return;
		}

		if (preferencesQuery.error) {
			setMediaAutoplayEnabledState(DEFAULT_USER_PREFERENCES.mediaAutoplayEnabled);
			setIsReady(true);
			return;
		}

		setIsReady(false);
	}, [preferencesQuery.data, preferencesQuery.error, user]);

	const setMediaAutoplayEnabled = useCallback(
		(value: boolean) => {
			const previousValue = mediaAutoplayEnabled;
			setMediaAutoplayEnabledState(value);

			if (!user) {
				return;
			}

			utils.user.getPreferences.setData(undefined, { mediaAutoplayEnabled: value });

			updatePreferencesMutation.mutate(
				{ mediaAutoplayEnabled: value },
				{
					onError: () => {
						setMediaAutoplayEnabledState(previousValue);
						utils.user.getPreferences.setData(undefined, {
							mediaAutoplayEnabled: previousValue,
						});
						toast.error("Не удалось сохранить настройку автоплея");
					},
					onSuccess: (preferences) => {
						setMediaAutoplayEnabledState(preferences.mediaAutoplayEnabled);
						utils.user.getPreferences.setData(undefined, preferences);
					},
				}
			);
		},
		[mediaAutoplayEnabled, updatePreferencesMutation, user, utils]
	);

	const value = useMemo(
		() => ({
			isReady,
			mediaAutoplayEnabled,
			setMediaAutoplayEnabled,
		}),
		[isReady, mediaAutoplayEnabled, setMediaAutoplayEnabled]
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
