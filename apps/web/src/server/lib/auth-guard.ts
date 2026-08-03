import type { User } from "@/shared/lib/auth-context";

import type { Context } from "../context";
import { ApiError as TRPCError } from "./api-error";

export type AuthedContext = Context & { user: User };

export function requireAuth(ctx: Context): asserts ctx is AuthedContext {
	if (!ctx.user) {
		throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
	}
}
