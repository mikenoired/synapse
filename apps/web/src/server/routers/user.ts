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
			z.object({
				mediaAutoplayEnabled: z.boolean(),
			})
		)
		.mutation(async ({ input, ctx }) => {
			const service = new UserService(ctx);
			return await service.updatePreferences(input);
		}),
});
