// 商品写真の選択UI（PhotoPicker）で扱う写真1枚分のデータ

export interface PhotoItem {
  id: string
  /** 選択された元の画像（再トリミングは常にこの画像から行う） */
  original: File
  /** 送信する画像（トリミング済みならトリミング後、未トリミングなら元の画像。1200pxを超える場合は縮小済み） */
  file: File
  previewUrl: string
  cropped: boolean
}

export const createPhotoId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

/** 一覧が持つプレビュー用URLを解放する（一覧を捨てるときに呼ぶ） */
export function revokePhotoPreviews(photos: PhotoItem[]): void {
  photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl))
}
