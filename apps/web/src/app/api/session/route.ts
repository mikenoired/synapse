import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyRefreshToken, verifyToken } from "@/server/lib/jwt";

const ACCESS_TOKEN_COOKIE = "synapse_token";
const REFRESH_TOKEN_COOKIE = "synapse_refresh_token";

function noStore(response: NextResponse) {
	response.headers.set("Cache-Control", "no-store");
	return response;
}

export async function POST(req: NextRequest) {
	try {
		const { token, refreshToken } = await req.json();

		if (!token || typeof token !== "string") {
			return noStore(NextResponse.json({ error: "Token required" }, { status: 400 }));
		}

		const payload = verifyToken(token);
		if (!payload) {
			return noStore(NextResponse.json({ error: "Invalid token" }, { status: 401 }));
		}

		const cookieStore = await cookies();

		cookieStore.set({
			name: ACCESS_TOKEN_COOKIE,
			value: token,
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 60 * 60 * 24,
			path: "/",
		});

		if (refreshToken && typeof refreshToken === "string") {
			const refreshPayload = verifyRefreshToken(refreshToken);
			if (refreshPayload) {
				cookieStore.set({
					name: REFRESH_TOKEN_COOKIE,
					value: refreshToken,
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: 60 * 60 * 24 * 7,
					path: "/",
				});
			} else {
			}
		}

		return noStore(
			NextResponse.json({
				success: true,
				user: { id: payload.userId, email: payload.email },
			})
		);
	} catch {
		return noStore(NextResponse.json({ error: "Invalid request" }, { status: 400 }));
	}
}

export async function DELETE() {
	try {
		const cookieStore = await cookies();
		cookieStore.set({ name: ACCESS_TOKEN_COOKIE, value: "", maxAge: 0, path: "/" });
		cookieStore.set({ name: REFRESH_TOKEN_COOKIE, value: "", maxAge: 0, path: "/" });
		return noStore(NextResponse.json({ success: true }));
	} catch {
		return noStore(NextResponse.json({ error: "Failed to clear session" }, { status: 500 }));
	}
}
