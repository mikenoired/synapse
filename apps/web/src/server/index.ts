import { Hono } from "hono";
import { serveStatic } from "hono/bun";

import { api } from "./api/app";
import { log } from "./lib/logger";

const app = new Hono().route("/api", api);

app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", serveStatic({ path: "./dist/index.html" }));

export const server = Bun.serve({
	port: Number(process.env.PORT ?? 3000),
	fetch: app.fetch,
});

log("info", "server.started", { port: server.port, environment: process.env.NODE_ENV || "development" });
