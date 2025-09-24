export function getSecureImageUrl(objectName: string, token?: string): string {
  if (!objectName)
    return ''

  if (objectName.startsWith('http'))
    return objectName

  const baseUrl = '/api/files'
  const url = `${baseUrl}/${objectName}`

  if (token)
    return `${url}?token=${encodeURIComponent(token)}`

  return url
}

export function isImageContent(content: string): boolean {
  return content.includes('/images/') || content.startsWith('images/')
}

export async function getPresignedMediaUrl(apiPath: string): Promise<string> {
  if (!apiPath)
    throw new Error('Invalid media path')

  if (apiPath.startsWith('http://') || apiPath.startsWith('https://')) {
    return apiPath
  }

  const normalizedApiPath = apiPath.startsWith('/api/files/')
    ? apiPath
    : `/api/files/${apiPath.replace(/^\/+/, '')}`

  // We now return the proxy path directly; the route performs a 302 redirect
  // to the presigned URL. Auth is via HttpOnly cookie (synapse_token). Never append tokens to URL.
  return normalizedApiPath
}
