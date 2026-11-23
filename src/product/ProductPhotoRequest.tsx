import { useEffect, useRef, useState } from 'react'
import PhotoPicker from '../components/PhotoPicker.tsx'
import { revokePhotoPreviews } from '../components/photoItems.ts'
import type { PhotoItem } from '../components/photoItems.ts'
import { PHOTO_REQUEST_MAX_COUNT, submitProductPhotoRequest } from './photoRequest.ts'

interface ProductPhotoRequestProps {
  productId: number
  /** ClerkのユーザーID */
  userId: string
}

/**
 * 「この商品の画像を投稿する」ボタンと、画像の申請画面。
 * 複数枚を選べ、追加するときにトリミング(1:1・4:3・3:4)とリサイズ(長辺1200px)ができる。
 * 申請した画像は、管理者が承認するまで商品ページに表示されない。
 */
function ProductPhotoRequest({ productId, userId }: ProductPhotoRequestProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // アンマウント・クリア時にプレビュー用URLを解放するため、最新の一覧を保持する
  const photosRef = useRef<PhotoItem[]>([])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => revokePhotoPreviews(photosRef.current)
  }, [])

  // Escキーで閉じる（トリミング画面が開いているときは、トリミング画面側のEscが先に処理される）
  useEffect(() => {
    if (!isOpen) {
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('.stack-cropModal') && !isSubmitting) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting])

  const handleOpen = () => {
    setSubmitted(false)
    setError(null)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }
    setIsOpen(false)
  }

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError('画像を1枚以上選択してください。')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // 並び順（左から）がそのまま優先順位になる
      await submitProductPhotoRequest({ userId, productId, photos: photos.map((photo) => photo.file) })
      revokePhotoPreviews(photosRef.current)
      setPhotos([])
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の申請に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stack-photoRequest">
		
      <a
        href="#"
        role="button"
        className="elem-link"
        onClick={(event) => {
          // ページ先頭へ移動せず、申請画面を開く
          event.preventDefault()
          handleOpen()
        }}
      >
        この商品の画像を投稿する
      </a>

      {isOpen && (
        <div className="stack-photoRequestModal" role="dialog" aria-modal="true" aria-label="商品画像の投稿">
          <div className="inner">
            <p className="elem-title">この商品の画像を投稿する</p>
            {submitted ? (
              <>
                <p className="stack-success">
                  画像を申請しました。管理者の承認後に、この商品ページへ表示されます。
                </p>
                <div className="stack-modalActions">
                  <button type="button" className="elem-button -typeA" onClick={() => setSubmitted(false)}>
                    続けて投稿する
                  </button>
                  <button type="button" className="elem-button -typeA" onClick={handleClose}>
                    閉じる
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="elem-notes -typeA">
                  投稿した画像は、管理者の承認後に商品ページへ表示されます。複数枚を選べます。
                </p>
                <PhotoPicker
                  value={photos}
                  onChange={setPhotos}
                  inputId="productPhotoRequest"
                  maxCount={PHOTO_REQUEST_MAX_COUNT}
                />
                {error && <p className="stack-error">{error}</p>}
                <div className="stack-modalActions">
                  <button
                    type="button"
                    className="elem-button -typeA"
                    disabled={isSubmitting || photos.length === 0}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? '送信中...' : '申請する'}
                  </button>
                  <button type="button" className="elem-button -typeA" disabled={isSubmitting} onClick={handleClose}>
                    キャンセル
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
			
    </div>
  )
}

export default ProductPhotoRequest
