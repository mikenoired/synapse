import type { User } from "@/shared/lib/auth-context";

import type { Context } from "../context";
import { ApiError } from "./api-error";

export type AuthedContext = Context & { user: User };

export function requireAuth(ctx: Context): asserts ctx is AuthedContext {
	if (!ctx.user) {
		throw new ApiError({ code: "UNAUTHORIZED", message: "Unauthorized" });
	}
}
