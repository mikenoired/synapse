import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { signEdgeToken, verifyEdgeToken } from "@/server/lib/edge-jwt";

const ACCESS_TOKEN_COOKIE = "synapse_token";
const REFRESH_TOKEN_COOKIE = "synapse_refresh_token";
const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

const cookieOptions = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "strict" as const,
	path: "/",
};

function clearAuthCookies(response: NextResponse) {
	response.cookies.set({ name: ACCESS_TOKEN_COOKIE, value: "", maxAge: 0, path: "/" });
	response.cookies.set({ name: REFRESH_TOKEN_COOKIE, value: "", maxAge: 0, path: "/" });
}

export async function proxy(request: NextRequest) {
	const accessSecret = process.env.JWT_SECRET;
	const refreshSecret = process.env.JWT_REFRESH_SECRET;

	if (!accessSecret || !refreshSecret) return NextResponse.next();

	const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
	const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
	const accessPayload = await verifyEdgeToken(accessToken, "access", accessSecret);

	if (accessPayload) return NextResponse.next();

	const refreshPayload = await verifyEdgeToken(refreshToken, "refresh", refreshSecret);
	if (!refreshPayload) {
		const response = NextResponse.next();
		if (accessToken || refreshToken) clearAuthCookies(response);
		return response;
	}

	const tokenPayload = {
		userId: refreshPayload.userId,
		email: refreshPayload.email,
	};
	const newAccessToken = await signEdgeToken(tokenPayload, "access", accessSecret, ACCESS_TOKEN_MAX_AGE);
	const newRefreshToken = await signEdgeToken(tokenPayload, "refresh", refreshSecret, REFRESH_TOKEN_MAX_AGE);

	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("x-synapse-access-token", newAccessToken);
	requestHeaders.set("x-synapse-refresh-token", newRefreshToken);

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});

	response.cookies.set({
		...cookieOptions,
		name: ACCESS_TOKEN_COOKIE,
		value: newAccessToken,
		maxAge: ACCESS_TOKEN_MAX_AGE,
	});
	response.cookies.set({
		...cookieOptions,
		name: REFRESH_TOKEN_COOKIE,
		value: newRefreshToken,
		maxAge: REFRESH_TOKEN_MAX_AGE,
	});

	return response;
}

export const config = {
	matcher: ["/", "/dashboard/:path*", "/api/:path*", "/api/user", "/api/files/:path*", "/api/parse-link"],
};
