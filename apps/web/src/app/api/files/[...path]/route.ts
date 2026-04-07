import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyToken } from "@/server/lib/jwt";
import { getPresignedUrl } from "@/shared/api/minio";

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
	try {
		const headerToken = request.headers.get("authorization")?.replace("Bearer ", "");
		const cookieToken = request.cookies.get("synapse_token")?.value;
		const queryToken = request.nextUrl.searchParams.get("token");
		const token = headerToken || cookieToken || queryToken;

		if (!token) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const payload = verifyToken(token);
		if (!payload) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { path } = await context.params;
		const objectName = path.join("/");

		const pathUserId = objectName.split("/")[1]; // images/userId/filename
		if (!pathUserId || pathUserId !== payload.userId) {
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
