import { apiUrl } from "@/shared/config/api";

export function getSecureImageUrl(objectName: string, token?: string): string {
	if (!objectName) return "";

	if (objectName.startsWith("http")) return objectName;

	const filePath = objectName.startsWith("/api/files/")
		? objectName.slice("/api".length)
		: `/files/${objectName.replace(/^\/+/, "")}`;
	const url = apiUrl(filePath);

	if (token) return `${url}?token=${encodeURIComponent(token)}`;

	return url;
}

export function isImageContent(content: string): boolean {
	return content.includes("/images/") || content.startsWith("images/");
}

export function getPresignedMediaUrl(apiPath: string): string {
	if (!apiPath || apiPath.startsWith("data:") || /^https?:\/\//.test(apiPath)) return apiPath;
	return getSecureImageUrl(apiPath);
}
