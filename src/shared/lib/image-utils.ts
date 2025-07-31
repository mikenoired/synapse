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