import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { UserPreferencesInput } from "@/shared/lib/user-preferences";
import { normalizeUserPreferences } from "@/shared/lib/user-preferences";

import type { Context } from "../context";
import { users } from "../db/schema";

export default class UserRepository {
	constructor(private readonly ctx: Context) {}

	async getUser() {
		if (!this.ctx.user) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Unauthorized",
			});
		}

		const user = await this.ctx.db.query.users.findFirst({
			where: eq(users.id, this.ctx.user.id),
			columns: {
				id: true,
				email: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return user;
	}

	async getPreferences() {
		if (!this.ctx.user) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Unauthorized",
			});
		}

		const user = await this.ctx.db.query.users.findFirst({
			where: eq(users.id, this.ctx.user.id),
			columns: {
				preferences: true,
			},
		});

		if (!user) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return normalizeUserPreferences(user.preferences);
	}

	async updatePreferences(preferences: UserPreferencesInput) {
		if (!this.ctx.user) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Unauthorized",
			});
		}

		const currentPreferences = await this.getPreferences();
		const nextPreferences = normalizeUserPreferences({
			...currentPreferences,
			...preferences,
		});

		const [updatedUser] = await this.ctx.db
			.update(users)
			.set({
				preferences: nextPreferences,
				updatedAt: new Date(),
			})
			.where(eq(users.id, this.ctx.user.id))
			.returning({
				preferences: users.preferences,
			});

		if (!updatedUser) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "User not found",
			});
		}

		return normalizeUserPreferences(updatedUser.preferences);
	}
}
