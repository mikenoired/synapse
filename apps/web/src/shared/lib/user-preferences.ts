export type InterfaceLanguage = "ru" | "en";

export interface UserPreferences {
	interfaceLanguage: InterfaceLanguage;
	mediaAutoplayEnabled: boolean;
	noteSparklesEnabled: boolean;
}

export type UserPreferencesInput = Partial<UserPreferences>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
	interfaceLanguage: "ru",
	mediaAutoplayEnabled: true,
	noteSparklesEnabled: true,
};

export function normalizeUserPreferences(preferences?: UserPreferencesInput | null): UserPreferences {
	const interfaceLanguage =
		preferences?.interfaceLanguage === "en" || preferences?.interfaceLanguage === "ru"
			? preferences.interfaceLanguage
			: DEFAULT_USER_PREFERENCES.interfaceLanguage;

	return {
		...DEFAULT_USER_PREFERENCES,
		...preferences,
		interfaceLanguage,
	};
}
