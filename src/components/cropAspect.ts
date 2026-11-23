// 商品写真のトリミングで選べる縦横比（幅:高さ）

export type CropAspect = '1:1' | '4:3' | '3:4'

export const CROP_ASPECT_OPTIONS: { value: CropAspect; label: string }[] = [
  { value: '1:1', label: '1:1（正方形）' },
  { value: '4:3', label: '4:3（横長）' },
  { value: '3:4', label: '3:4（縦長）' },
]

/** 縦横比の数値表現（幅 ÷ 高さ） */
export const CROP_ASPECT_RATIOS: Record<CropAspect, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
}

export const DEFAULT_CROP_ASPECT: CropAspect = '1:1'
