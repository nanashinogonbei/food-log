import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import ImageCropModal from './ImageCropModal.tsx'
import { DEFAULT_CROP_ASPECT } from './cropAspect.ts'
import type { CropAspect } from './cropAspect.ts'
import { MAX_PHOTO_FILE_SIZE, resizeImageFile } from './resizeImage.ts'
import { createPhotoId, revokePhotoPreviews } from './photoItems.ts'
import type { PhotoItem } from './photoItems.ts'

interface PhotoPickerProps {
  value: PhotoItem[]
  onChange: (next: PhotoItem[]) => void
  /** <input type="file"> のid（<label htmlFor> と合わせる） */
  inputId?: string
  /** 追加できる最大枚数。省略すると無制限 */
  maxCount?: number
}

/**
 * 商品写真の選択UI。ファイル選択/ドラッグ&ドロップで追加し、追加するときに
 * 1:1・4:3・3:4でトリミングできる。縦横どちらかが1200pxを超える画像は長辺1200pxに縮小される。
 * サムネイルは左から順に優先され、ドラッグ&ドロップ（または◀▶ボタン）で並び替えられる。
 * value の並び順がそのまま表示の優先順位になる。
 */
function PhotoPicker({ value, onChange, inputId = 'photo', maxCount }: PhotoPickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  // トリミング待ちの画像（先頭から順に1枚ずつトリミング画面を表示する）
  const [cropQueue, setCropQueue] = useState<File[]>([])
  // 追加済みの画像を再トリミングしているときの対象ID
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [lastAspect, setLastAspect] = useState<CropAspect>(DEFAULT_CROP_ASPECT)
  // 並び替え中のドラッグ状態
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  // リサイズ処理中に続けて押されても二重に追加しないようにする
  const resizingRef = useRef(false)
  // 非同期処理（縮小）の後でも最新の一覧に追加できるよう、最新の値を保持する
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const remainingSlots = maxCount === undefined ? Infinity : maxCount - value.length - cropQueue.length

  // --- 画像の追加 ---

  const addFiles = (files: File[]) => {
    if (files.length === 0) {
      return
    }

    const messages: string[] = []
    const imageFiles = files.filter((file) => file.type.startsWith('image/'))
    if (imageFiles.length < files.length) {
      messages.push('画像ファイル以外は登録できません。')
    }

    // 追加済み・トリミング待ちと重複する画像は除く
    const knownIds = new Set([...value.map((photo) => photo.id), ...cropQueue.map(createPhotoId)])
    const queued: File[] = []
    imageFiles.forEach((file) => {
      const id = createPhotoId(file)
      if (!knownIds.has(id)) {
        knownIds.add(id)
        queued.push(file)
      }
    })

    const allowed = queued.slice(0, Math.max(remainingSlots, 0))
    if (allowed.length < queued.length) {
      messages.push(`写真は${maxCount}枚まで登録できます。`)
    }

    setPhotoError(messages.length > 0 ? messages.join(' ') : null)

    if (allowed.length > 0) {
      setCropQueue((current) => [...current, ...allowed])
    }
  }

  // トリミングしない画像は、縦横どちらかが1200pxを超えていれば長辺1200pxに縮小して追加する
  const appendPhotos = async (items: { original: File; file: File; cropped: boolean }[]) => {
    const prepared = await Promise.all(
      items.map(async (item) => (item.cropped ? item : { ...item, file: await resizeImageFile(item.file) })),
    )

    const added: PhotoItem[] = []
    prepared.forEach((item) => {
      if (item.file.size > MAX_PHOTO_FILE_SIZE) {
        setPhotoError('5MBを超える画像は、トリミングして小さくするか別の画像を選んでください。')
        return
      }
      added.push({
        id: createPhotoId(item.original),
        original: item.original,
        file: item.file,
        previewUrl: URL.createObjectURL(item.file),
        cropped: item.cropped,
      })
    })

    if (added.length > 0) {
      onChange([...valueRef.current, ...added])
    }
  }

  const replacePhotoFile = async (id: string, source: File, cropped: boolean) => {
    const file = cropped ? source : await resizeImageFile(source)
    if (file.size > MAX_PHOTO_FILE_SIZE) {
      setPhotoError('5MBを超える画像は、トリミングして小さくするか別の画像を選んでください。')
      return
    }
    onChange(
      valueRef.current.map((photo) => {
        if (photo.id !== id) {
          return photo
        }
        URL.revokeObjectURL(photo.previewUrl)
        return { ...photo, file, cropped, previewUrl: URL.createObjectURL(file) }
      }),
    )
  }

  const removePhoto = (id: string) => {
    revokePhotoPreviews(value.filter((photo) => photo.id === id))
    onChange(value.filter((photo) => photo.id !== id))
  }

  // --- トリミング画面の操作 ---

  const editingPhoto = editingPhotoId !== null ? value.find((photo) => photo.id === editingPhotoId) ?? null : null
  const cropTargetFile = editingPhoto ? editingPhoto.original : cropQueue[0] ?? null

  const handleCropConfirm = (cropped: File, aspect: CropAspect) => {
    setLastAspect(aspect)
    if (editingPhoto) {
      void replacePhotoFile(editingPhoto.id, cropped, true)
      setEditingPhotoId(null)
    } else if (cropQueue[0]) {
      void appendPhotos([{ original: cropQueue[0], file: cropped, cropped: true }])
      setCropQueue((current) => current.slice(1))
    }
  }

  const runResizing = async (task: () => Promise<void>) => {
    if (resizingRef.current) {
      return
    }
    resizingRef.current = true
    try {
      await task()
    } finally {
      resizingRef.current = false
    }
  }

  const handleCropUseOriginal = () =>
    runResizing(async () => {
      if (editingPhoto) {
        await replacePhotoFile(editingPhoto.id, editingPhoto.original, false)
        setEditingPhotoId(null)
      } else if (cropQueue[0]) {
        await appendPhotos([{ original: cropQueue[0], file: cropQueue[0], cropped: false }])
        setCropQueue((current) => current.slice(1))
      }
    })

  const handleCropUseOriginalAll = () =>
    runResizing(async () => {
      await appendPhotos(cropQueue.map((file) => ({ original: file, file, cropped: false })))
      setCropQueue([])
    })

  const handleCropCancel = () => {
    if (editingPhoto) {
      setEditingPhotoId(null)
    } else {
      // 表示中の1枚は追加せず、次の画像へ進む
      setCropQueue((current) => current.slice(1))
    }
  }

  // --- 表示順の並び替え（左から順に優先される） ---

  const reorderPhotos = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to || from >= value.length || to >= value.length) {
      return
    }
    const next = [...value]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  const resetDragState = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  // --- ファイルの選択・ドラッグ&ドロップ追加（サムネイルの並び替えドラッグとは区別する） ---

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files ? Array.from(event.target.files) : [])
    // 同じファイルを続けて選択し直せるように値をリセットする
    event.target.value = ''
  }

  const isFileDrag = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes('Files')

  const handleDropZoneDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragging(true)
  }

  const handleDropZoneDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // 子要素への移動ではハイライトを解除しない
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }
    setIsDragging(false)
  }

  const handleDropZoneDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) {
      return
    }
    event.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(event.dataTransfer.files))
  }

  const handleDropZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <>
      <div className="elem-parts stack-photoPost -sortable">
        {photoError && <p className="photo-dropzone__error">{photoError}</p>}

        {value.length > 0 && (
          <ul className="cluster-photoSort">
            {value.map((photo, index) => (
              <li
                key={photo.id}
                className={`item${draggingId === photo.id ? ' -dragging' : ''}${dragOverId === photo.id && draggingId !== photo.id ? ' -dragOver' : ''}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', photo.id)
                  setDraggingId(photo.id)
                }}
                onDragOver={(event) => {
                  if (draggingId === null) {
                    return
                  }
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDragOverId(photo.id)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (draggingId !== null) {
                    reorderPhotos(
                      value.findIndex((item) => item.id === draggingId),
                      index,
                    )
                  }
                  resetDragState()
                }}
                onDragEnd={resetDragState}
              >
                <span className="elem-order">{index === 0 ? '1（メイン）' : index + 1}</span>
                <div className="elem-thumb">
                  <img src={photo.previewUrl} alt={photo.file.name} title={photo.file.name} draggable={false} />
                </div>
                <div className="elem-thumbActions">
                  <button
                    type="button"
                    aria-label={`${photo.file.name} を左へ移動`}
                    disabled={index === 0}
                    onClick={() => reorderPhotos(index, index - 1)}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    aria-label={`${photo.file.name} をトリミング`}
                    onClick={() => setEditingPhotoId(photo.id)}
                  >
                    {photo.cropped ? '再調整' : 'トリミング'}
                  </button>
                  <button
                    type="button"
                    aria-label={`${photo.file.name} を右へ移動`}
                    disabled={index === value.length - 1}
                    onClick={() => reorderPhotos(index, index + 1)}
                  >
                    ▶
                  </button>
                </div>
                <button
                  type="button"
                  className="button-remove"
                  aria-label={`${photo.file.name} を削除`}
                  onClick={() => removePhoto(photo.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {remainingSlots > 0 && (
          <div
            className={`stack-dropzone${isDragging ? ' -active' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="商品写真を選択またはドラッグ&ドロップで追加"
            onClick={() => inputRef.current?.click()}
            onKeyDown={handleDropZoneKeyDown}
            onDragEnter={handleDropZoneDragOver}
            onDragOver={handleDropZoneDragOver}
            onDragLeave={handleDropZoneDragLeave}
            onDrop={handleDropZoneDrop}
          >
            <img src="/assets/img/icon-img.svg" width="50px" />
            <p>ここに画像をドラッグ&amp;ドロップ<br />またはクリックしてファイルを選択</p>
            <input
              ref={inputRef}
              id={inputId}
              className="elem-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleInputChange}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </div>

      <p className="elem-notes -typeA">
        縦横どちらかが1200pxを超える画像は、1200pxに自動で縮小されます。
        {maxCount !== undefined && <>写真は最大{maxCount}枚までです。</>}
        {value.length > 1 && <>左から順に優先して表示されます（1枚目がメイン画像）。画像をドラッグ&amp;ドロップ（または◀▶ボタン）で並び替えられます。</>}
      </p>

      {cropTargetFile && (
        <ImageCropModal
          key={editingPhoto ? editingPhoto.id : createPhotoId(cropTargetFile)}
          file={cropTargetFile}
          initialAspect={lastAspect}
          remaining={editingPhoto ? 1 : cropQueue.length}
          confirmLabel={editingPhoto ? 'トリミングを反映' : 'トリミングして追加'}
          useOriginalLabel={editingPhoto ? 'トリミングを解除' : 'トリミングせず追加'}
          onConfirm={handleCropConfirm}
          onUseOriginal={handleCropUseOriginal}
          onUseOriginalAll={editingPhoto ? undefined : handleCropUseOriginalAll}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}

export default PhotoPicker
