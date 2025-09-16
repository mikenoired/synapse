export async function getVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.currentTime = 0
    video.addEventListener('loadeddata', () => {
      video.currentTime = 0
    })
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      } else {
        reject(new Error('Canvas context is null'))
      }
      URL.revokeObjectURL(url)
    })
    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Ошибка загрузки видео'))
    })
  })
}