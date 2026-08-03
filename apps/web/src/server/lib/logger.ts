/* eslint-disable no-console -- Bun server logger writes structured JSON to stdout/stderr. */

type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
const minimumLevel = levels[configuredLevel] ?? levels.info;

export function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
	if (levels[level] < minimumLevel) return;

	const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields });
	if (level === "error") console.error(line);
	else if (level === "warn") console.warn(line);
	else console.log(line);
}

export function logError(event: string, error: unknown, fields: Record<string, unknown> = {}) {
	const details =
		error instanceof Error
			? { error: error.message, stack: process.env.NODE_ENV === "production" ? undefined : error.stack }
			: { error: String(error) };
	log("error", event, { ...fields, ...details });
}
