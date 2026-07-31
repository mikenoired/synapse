import { z } from "zod";

import UserService from "../services/user.service";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
	getUser: protectedProcedure.query(async ({ ctx }) => {
		const service = new UserService(ctx);
		return await service.getUser();
	}),
	getStorageUsage: protectedProcedure.query(async ({ ctx }) => {
		const service = new UserService(ctx);
		return await service.getStorageUsage();
	}),
	getPreferences: protectedProcedure.query(async ({ ctx }) => {
		const service = new UserService(ctx);
		return await service.getPreferences();
	}),
	updatePreferences: protectedProcedure
		.input(
			z
				.object({
					autoTagColorEnabled: z.boolean().optional(),
					interfaceLanguage: z.enum(["ru", "en"]).optional(),
					mediaAutoplayEnabled: z.boolean().optional(),
					noteSparklesEnabled: z.boolean().optional(),
				})
				.refine((value) => Object.keys(value).length > 0, {
					message: "At least one preference must be provided",
				})
		)
		.mutation(async ({ input, ctx }) => {
			const service = new UserService(ctx);
			return await service.updatePreferences(input);
		}),
});
