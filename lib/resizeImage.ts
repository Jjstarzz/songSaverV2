/**
 * Downscale an image file to fit within `maxSize` px on its longest side and
 * re-encode as JPEG. Used before sending photos to /api/ocr-lyrics so uploads
 * stay small regardless of the phone camera's resolution.
 */
export function resizeImage(
  file: File,
  maxSize = 1024,
  quality = 0.85,
): Promise<{ base64: string; mediaType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not process image'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve({ base64: canvas.toDataURL('image/jpeg', quality).split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image — try a JPEG or PNG photo'))
    }
    img.src = url
  })
}
