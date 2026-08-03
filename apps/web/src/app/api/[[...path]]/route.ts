import { Hono } from "hono";

import { api } from "@/server/api/app";

// Transitional adapter: lets the existing Next shell consume the Hono API while
// the TanStack Router/Vite shell is introduced. Bun serves the same app directly.
const hono = new Hono().route("/api", api);

function handler(request: Request) {
	return hono.fetch(request);
}

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT };
