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
  if (!apiPath) throw new Error('Invalid media path')

  if (apiPath.startsWith('http://') || apiPath.startsWith('https://')) {
    return apiPath
  }

  const normalizedApiPath = apiPath.startsWith('/api/files/')
    ? apiPath
    : `/api/files/${apiPath.replace(/^\/+/, '')}`

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(normalizedApiPath, {
    credentials: 'include',
    headers
  })

  if (!res.ok) throw new Error('Failed to get file link')
  const data = await res.json()
  return data.presignedUrl
} 