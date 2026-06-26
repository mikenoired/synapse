export interface EdgeJWTPayload {
	userId: string;
	email: string;
	type: "access" | "refresh";
	exp?: number;
	iat?: number;
}

function base64UrlEncode(input: string | Uint8Array): string {
	const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
	const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

async function signData(data: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
	return base64UrlEncode(new Uint8Array(signature));
}

export async function signEdgeToken(
	payload: Omit<EdgeJWTPayload, "type" | "exp" | "iat">,
	type: "access" | "refresh",
	secret: string,
	expiresInSeconds: number
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const body = base64UrlEncode(
		JSON.stringify({
			...payload,
			type,
			iat: now,
			exp: now + expiresInSeconds,
		})
	);
	const data = `${header}.${body}`;
	const signature = await signData(data, secret);
	return `${data}.${signature}`;
}

export async function verifyEdgeToken(
	token: string | undefined,
	type: "access" | "refresh",
	secret: string
): Promise<EdgeJWTPayload | null> {
	if (!token) return null;

	const [header, body, signature] = token.split(".");
	if (!header || !body || !signature) return null;

	try {
		const expectedSignature = await signData(`${header}.${body}`, secret);
		if (signature !== expectedSignature) return null;

		const payload = JSON.parse(base64UrlDecode(body)) as EdgeJWTPayload;
		if (payload.type !== type || !payload.userId || !payload.email) return null;
		if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000)) return null;

		return payload;
	} catch {
		return null;
	}
}
