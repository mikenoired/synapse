import { TRPCError } from "@trpc/server";

import type { User } from "@/shared/lib/auth-context";

import type { Context } from "../context";

export type AuthedContext = Context & { user: User };

export function requireAuth(ctx: Context): asserts ctx is AuthedContext {
	if (!ctx.user) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
	}
}
