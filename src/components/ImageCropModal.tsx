import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, PointerEvent } from 'react'
import { CROP_ASPECT_OPTIONS, CROP_ASPECT_RATIOS } from './cropAspect.ts'
import type { CropAspect } from './cropAspect.ts'
import { MAX_PHOTO_LONG_SIDE, exportCanvas } from './resizeImage.ts'

/** トリミング範囲の大きさ（切り抜ける最大サイズに対する%）の下限 */
const MIN_ZOOM = 20
/** 矢印キー1回あたりの移動量（画像サイズに対する割合） */
const KEY_STEP_RATE = 0.02

interface LoadedImage {
  url: string
  element: HTMLImageElement
  width: number
  height: number
}

interface ImageCropModalProps {
  file: File
  initialAspect: CropAspect
  /** 続けてトリミングする残り枚数（表示中の1枚を含む）。1以下なら表示しない */
  remaining?: number
  confirmLabel?: string
  useOriginalLabel?: string
  onConfirm: (cropped: File, aspect: CropAspect) => void
  onUseOriginal: () => void
  /** 残りの画像をすべてトリミングせずに追加する（複数枚選択時のみ渡す） */
  onUseOriginalAll?: () => void
  onCancel: () => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function ImageCropModal({
  file,
  initialAspect,
  remaining = 1,
  confirmLabel = 'トリミングして追加',
  useOriginalLabel = 'トリミングせず追加',
  onConfirm,
  onUseOriginal,
  onUseOriginalAll,
  onCancel,
}: ImageCropModalProps) {
  const [loaded, setLoaded] = useState<LoadedImage | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [aspect, setAspect] = useState<CropAspect>(initialAspect)
  // トリミング範囲の大きさ（最大サイズに対する%）
  const [zoom, setZoom] = useState(100)
  // トリミング範囲の中心（画像全体に対する0〜1の割合）
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 })
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; startCx: number; startCy: number } | null>(null)

  // 画像を読み込む（別のファイルを扱うときは呼び出し側で key を変えて作り直す）
  useEffect(() => {
    let cancelled = false
    const url = URL.createObjectURL(file)
    const element = new Image()

    element.onload = () => {
      if (!cancelled) {
        setLoaded({ url, element, width: element.naturalWidth, height: element.naturalHeight })
      }
    }
    element.onerror = () => {
      if (!cancelled) {
        setLoadFailed(true)
      }
    }
    element.src = url

    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [file])

  // Escキーでキャンセル
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  // トリミング範囲（元画像のピクセル座標）。縦横比・大きさ・中心から毎回求め、画像の外にはみ出さないよう丸める。
  const ratio = CROP_ASPECT_RATIOS[aspect]
  const rect = (() => {
    if (!loaded) {
      return null
    }
    const maxWidth = Math.min(loaded.width, loaded.height * ratio)
    const width = (maxWidth * zoom) / 100
    const height = width / ratio
    const cx = clamp(center.x * loaded.width, width / 2, loaded.width - width / 2)
    const cy = clamp(center.y * loaded.height, height / 2, loaded.height - height / 2)
    return { x: cx - width / 2, y: cy - height / 2, w: width, h: height, cx, cy }
  })()

  const moveCenterTo = (cx: number, cy: number) => {
    if (!loaded || !rect) {
      return
    }
    setCenter({
      x: clamp(cx, rect.w / 2, loaded.width - rect.w / 2) / loaded.width,
      y: clamp(cy, rect.h / 2, loaded.height - rect.h / 2) / loaded.height,
    })
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!rect) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startX: event.clientX, startY: event.clientY, startCx: rect.cx, startCy: rect.cy }
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const stage = stageRef.current
    if (!drag || !stage || !loaded) {
      return
    }
    // 画面上の移動量を元画像のピクセルに換算する
    const scale = stage.getBoundingClientRect().width / loaded.width
    moveCenterTo(drag.startCx + (event.clientX - drag.startX) / scale, drag.startCy + (event.clientY - drag.startY) / scale)
  }

  const handlePointerEnd = () => {
    dragRef.current = null
  }

  const handleBoxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!loaded || !rect) {
      return
    }
    const step = (event.shiftKey ? 5 : 1) * KEY_STEP_RATE
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (!move) {
      return
    }
    event.preventDefault()
    moveCenterTo(rect.cx + move[0] * loaded.width, rect.cy + move[1] * loaded.height)
  }

  const handleZoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    setZoom(Number(event.target.value))
  }

  const handleConfirm = async () => {
    if (!loaded || !rect || isExporting) {
      return
    }

    setIsExporting(true)
    setExportError(null)

    try {
      const scale = Math.min(1, MAX_PHOTO_LONG_SIDE / Math.max(rect.w, rect.h))
      const outWidth = Math.max(1, Math.round(rect.w * scale))
      const outHeight = Math.max(1, Math.round(rect.h * scale))

      const canvas = document.createElement('canvas')
      canvas.width = outWidth
      canvas.height = outHeight
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('画像の書き出しに失敗しました。')
      }

      const draw = (fillWhite: boolean) => {
        context.clearRect(0, 0, outWidth, outHeight)
        if (fillWhite) {
          // JPEGは透過を持てないため、背景を白にする
          context.fillStyle = '#fff'
          context.fillRect(0, 0, outWidth, outHeight)
        }
        context.imageSmoothingQuality = 'high'
        context.drawImage(loaded.element, rect.x, rect.y, rect.w, rect.h, 0, 0, outWidth, outHeight)
      }

      // PNGはPNGのまま、それ以外はJPEGで書き出す。5MBを超える場合は画質を下げる
      const blob = await exportCanvas(canvas, file.type, draw)

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
      const extension = blob.type === 'image/png' ? 'png' : 'jpg'
      onConfirm(new File([blob], `${baseName}-crop.${extension}`, { type: blob.type, lastModified: Date.now() }), aspect)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : '画像の書き出しに失敗しました。')
      setIsExporting(false)
    }
  }

  return (
    <div className="stack-cropModal" role="dialog" aria-modal="true" aria-label="商品写真のトリミング">
      <div className="inner">
        <p className="elem-title">
          商品写真のトリミング
          {remaining > 1 && <span className="count">（残り{remaining}枚）</span>}
        </p>
        <p className="elem-fileName">{file.name}</p>

        {loadFailed ? (
          <p className="stack-error">この画像は読み込めないため、トリミングできません。</p>
        ) : (
          <>
            <div className="stack-selectUI" role="radiogroup" aria-label="切り抜きの縦横比">
              {CROP_ASPECT_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="radio"
                    name="cropAspect"
                    value={option.value}
                    checked={aspect === option.value}
                    onChange={() => setAspect(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            {loaded && rect ? (
              <>
                <div
                  ref={stageRef}
                  className="cluster-stage"
                  style={{
                    aspectRatio: `${loaded.width} / ${loaded.height}`,
                    width: `min(100%, ${((50 * loaded.width) / loaded.height).toFixed(2)}vh)`,
                  }}
                >
                  <img src={loaded.url} alt="" draggable={false} />
                  <div
                    className="elem-cropBox"
                    role="group"
                    tabIndex={0}
                    aria-label="トリミング範囲（ドラッグまたは矢印キーで移動）"
                    style={{
                      left: `${(rect.x / loaded.width) * 100}%`,
                      top: `${(rect.y / loaded.height) * 100}%`,
                      width: `${(rect.w / loaded.width) * 100}%`,
                      height: `${(rect.h / loaded.height) * 100}%`,
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    onKeyDown={handleBoxKeyDown}
                  />
                </div>

                <div className="stack-zoom">
                  <label htmlFor="cropZoom">範囲の大きさ</label>
                  <input
                    id="cropZoom"
                    type="range"
                    min={MIN_ZOOM}
                    max={100}
                    step={1}
                    value={zoom}
                    onChange={handleZoomChange}
                  />
                </div>
                <p className="elem-notes -typeA">枠をドラッグして位置を調整できます（矢印キーでも移動できます）。</p>
              </>
            ) : (
              <p className="stack-load">画像を読み込んでいます...</p>
            )}
          </>
        )}

        {exportError && <p className="stack-error">{exportError}</p>}

        <div className="stack-cropActions">
          {!loadFailed && (
            <button
              type="button"
              className="elem-button -typeA"
              disabled={!loaded || isExporting}
              onClick={handleConfirm}
            >
              {isExporting ? '処理中...' : confirmLabel}
            </button>
          )}
          <button type="button" className="elem-button -typeA" disabled={isExporting} onClick={onUseOriginal}>
            {useOriginalLabel}
          </button>
          {onUseOriginalAll && remaining > 1 && (
            <button type="button" className="elem-button -typeA" disabled={isExporting} onClick={onUseOriginalAll}>
              残りもトリミングせず追加
            </button>
          )}
          <button type="button" className="elem-button -typeA" disabled={isExporting} onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImageCropModal
