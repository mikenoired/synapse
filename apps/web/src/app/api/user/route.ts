import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUserFromTokens } from "@/server/lib/auth-session";

const ACCESS_TOKEN_COOKIE = "synapse_token";
const REFRESH_TOKEN_COOKIE = "synapse_refresh_token";

function noStore(response: NextResponse) {
	response.headers.set("Cache-Control", "no-store");
	return response;
}

export async function GET(req: NextRequest) {
	try {
		const authHeader = req.headers.get("authorization");
		const middlewareAccessToken = req.headers.get("x-synapse-access-token");
		const middlewareRefreshToken = req.headers.get("x-synapse-refresh-token");
		const cookieToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
		const refreshToken = middlewareRefreshToken || req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

		const token = authHeader?.replace("Bearer ", "") || middlewareAccessToken || cookieToken;
		const user = getUserFromTokens(token, refreshToken);

		if (!user) {
			return noStore(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
		}

		return noStore(NextResponse.json(user));
	} catch {
		return noStore(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
	}
}
