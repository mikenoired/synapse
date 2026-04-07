import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyToken } from "@/server/lib/jwt";

const ACCESS_TOKEN_COOKIE = "synapse_token";

export async function GET(req: NextRequest) {
	try {
		const authHeader = req.headers.get("authorization");
		const cookieStore = await cookies();
		const cookieToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

		const token = authHeader?.replace("Bearer ", "") || cookieToken;

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const payload = verifyToken(token);

		if (!payload) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		return NextResponse.json({ id: payload.userId, email: payload.email });
	} catch {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
