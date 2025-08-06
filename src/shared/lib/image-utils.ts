export function getSecureImageUrl(objectName: string, token?: string): string {
  if (!objectName) return ''

  if (objectName.startsWith('http')) return objectName

  const baseUrl = '/api/files'
  const url = `${baseUrl}/${objectName}`

  if (token) return `${url}?token=${encodeURIComponent(token)}`

  return url
}

export function isImageContent(content: string): boolean {
  return content.includes('/images/') || content.startsWith('images/')
}

export async function getPresignedMediaUrl(apiPath: string, token?: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(apiPath, {
    credentials: 'include',
    headers
  });

  if (!res.ok) throw new Error('Не удалось получить ссылку на файл');
  const data = await res.json();
  return data.presignedUrl;
} 