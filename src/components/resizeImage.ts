// アップロードする商品写真のリサイズ

/** 縦横どれかがこの値を超えたら、長辺がこの値になるよう縮小する（アスペクト比は維持） */
export const MAX_PHOTO_LONG_SIDE = 1200

/** api/products.php の MAX_PHOTO_SIZE と合わせる */
export const MAX_PHOTO_FILE_SIZE = 5 * 1024 * 1024

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像の書き出しに失敗しました。'))),
      type,
      quality,
    )
  })

/**
 * 描画済みのcanvasを、API側の許可形式（PNGはPNG、それ以外はJPEG）のBlobに書き出す。
 * 5MBを超える場合は画質を下げたJPEGに切り替える。
 * @param draw canvasへ画像を描く関数（JPEGは透過を持てないため、fillWhite=true のとき白背景を敷くこと）
 */
export async function exportCanvas(
  canvas: HTMLCanvasElement,
  sourceType: string,
  draw: (fillWhite: boolean) => void,
): Promise<Blob> {
  let blob: Blob
  if (sourceType === 'image/png') {
    draw(false)
    blob = await canvasToBlob(canvas, 'image/png')
  } else {
    draw(true)
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  }

  if (blob.size > MAX_PHOTO_FILE_SIZE) {
    draw(true)
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.85)
  }

  return blob
}

const loadImage = (file: File) =>
  new Promise<{ element: HTMLImageElement; revoke: () => void }>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const element = new Image()
    element.onload = () => resolve({ element, revoke: () => URL.revokeObjectURL(url) })
    element.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像を読み込めませんでした。'))
    }
    element.src = url
  })

/**
 * 縦横どちらかが MAX_PHOTO_LONG_SIDE（1200px）を超える画像を、長辺1200pxに縮小して返す。
 * 1200px以下の画像、および読み込めない画像は元のファイルをそのまま返す。
 */
export async function resizeImageFile(file: File): Promise<File> {
  let loaded: Awaited<ReturnType<typeof loadImage>>
  try {
    loaded = await loadImage(file)
  } catch {
    return file
  }

  try {
    const { element } = loaded
    const longSide = Math.max(element.naturalWidth, element.naturalHeight)
    if (longSide <= MAX_PHOTO_LONG_SIDE) {
      return file
    }

    const scale = MAX_PHOTO_LONG_SIDE / longSide
    const width = Math.max(1, Math.round(element.naturalWidth * scale))
    const height = Math.max(1, Math.round(element.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      return file
    }

    const blob = await exportCanvas(canvas, file.type, (fillWhite) => {
      context.clearRect(0, 0, width, height)
      if (fillWhite) {
        context.fillStyle = '#fff'
        context.fillRect(0, 0, width, height)
      }
      context.imageSmoothingQuality = 'high'
      context.drawImage(element, 0, 0, width, height)
    })

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    const extension = blob.type === 'image/png' ? 'png' : 'jpg'
    return new File([blob], `${baseName}-resized.${extension}`, { type: blob.type, lastModified: Date.now() })
  } catch {
    return file
  } finally {
    loaded.revoke()
  }
}
