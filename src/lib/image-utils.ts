export function getSecureImageUrl(objectName: string, token?: string): string {
  if (!objectName) return ''

  // Если это уже полный URL (для обратной совместимости), возвращаем как есть
  if (objectName.startsWith('http')) {
    return objectName
  }

  // Создаем защищенный URL через наш API
  const baseUrl = '/api/files'
  const url = `${baseUrl}/${objectName}`

  // Добавляем токен как query параметр для изображений в img тегах
  if (token) {
    return `${url}?token=${encodeURIComponent(token)}`
  }

  return url
}

export function isImageContent(content: string): boolean {
  // Проверяем, является ли контент путем к изображению
  return content.includes('/images/') || content.startsWith('images/')
} 