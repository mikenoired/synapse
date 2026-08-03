export type ApiErrorCode =
	| "BAD_REQUEST"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "CONFLICT"
	| "TOO_MANY_REQUESTS"
	| "INTERNAL_SERVER_ERROR";

const statusByCode: Record<ApiErrorCode, number> = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
};

export class ApiError extends Error {
	readonly code: ApiErrorCode;
	readonly fieldErrors?: Record<string, string[] | undefined>;
	readonly status: number;

	constructor(options: {
		code: ApiErrorCode;
		message: string;
		fieldErrors?: Record<string, string[] | undefined>;
	});
	constructor(code: ApiErrorCode, message: string, fieldErrors?: Record<string, string[] | undefined>);
	constructor(
		codeOrOptions:
			| ApiErrorCode
			| { code: ApiErrorCode; message: string; fieldErrors?: Record<string, string[] | undefined> },
		message?: string,
		fieldErrors?: Record<string, string[] | undefined>
	) {
		const options =
			typeof codeOrOptions === "string"
				? { code: codeOrOptions, message: message || "Request failed", fieldErrors }
				: codeOrOptions;
		super(options.message);
		this.name = "ApiError";
		this.code = options.code;
		this.fieldErrors = options.fieldErrors;
		this.status = statusByCode[options.code];
	}
}
