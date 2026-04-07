export interface UserPreferences {
	mediaAutoplayEnabled: boolean;
}

export type UserPreferencesInput = Partial<UserPreferences>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
	mediaAutoplayEnabled: true,
};

export function normalizeUserPreferences(preferences?: UserPreferencesInput | null): UserPreferences {
	return {
		...DEFAULT_USER_PREFERENCES,
		...preferences,
	};
}
