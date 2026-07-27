import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";

import { db } from "./db";
import { getUserFromTokens } from "./lib/auth-session";
import { CacheRepository } from "./repositories/cache.repository";

export async function createContext({ req }: { req?: NextRequest }) {
	const requestHeaders = req ? undefined : await headers().catch(() => undefined);
	const authHeader = req?.headers.get("authorization") || requestHeaders?.get("authorization");
	const middlewareAccessToken =
		req?.headers.get("x-synapse-access-token") || requestHeaders?.get("x-synapse-access-token");
	const middlewareRefreshToken =
		req?.headers.get("x-synapse-refresh-token") || requestHeaders?.get("x-synapse-refresh-token");
	const headerToken = authHeader?.replace("Bearer ", "") || middlewareAccessToken;
	const cookieStore = await cookies().catch(() => undefined);
	const cookieToken = cookieStore?.get("synapse_token")?.value;
	const refreshToken = middlewareRefreshToken || cookieStore?.get("synapse_refresh_token")?.value;
	const token = headerToken || cookieToken;

	const user = getUserFromTokens(token, refreshToken);

	return {
		cache: new CacheRepository(),
		db,
		req,
		user,
		token,
		refreshToken,
		requestId: req?.headers.get("x-request-id") || crypto.randomUUID?.() || undefined,
		ip: req?.headers.get("x-forwarded-for") || undefined,
		userAgent: req?.headers.get("user-agent") || undefined,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
