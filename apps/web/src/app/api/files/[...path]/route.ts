import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getUserFromTokens } from "@/server/lib/auth-session";
import { getPresignedUrl } from "@/shared/api/minio";

const ACCESS_TOKEN_COOKIE = "synapse_token";
const REFRESH_TOKEN_COOKIE = "synapse_refresh_token";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
	try {
		const headerToken = request.headers.get("authorization")?.replace("Bearer ", "");
		const middlewareAccessToken = request.headers.get("x-synapse-access-token");
		const middlewareRefreshToken = request.headers.get("x-synapse-refresh-token");
		const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
		const refreshToken = middlewareRefreshToken || request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
		const queryToken = request.nextUrl.searchParams.get("token");
		const token = headerToken || middlewareAccessToken || cookieToken || queryToken;
		const user = getUserFromTokens(token, refreshToken);

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { path } = await context.params;
		const objectName = path.join("/");

		const pathUserId = objectName.split("/")[1]; // images/userId/filename
		if (!pathUserId || pathUserId !== user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const presignedUrl = await getPresignedUrl(objectName, 60 * 60); // 1 час
		const res = NextResponse.redirect(presignedUrl, { status: 302 });
		res.headers.set("Cache-Control", "private, max-age=300");
		return res;
	} catch {
		return NextResponse.json({ error: "File access failed" }, { status: 500 });
	}
}
