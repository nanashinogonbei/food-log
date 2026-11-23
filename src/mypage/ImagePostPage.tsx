import { useUser } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import PhotoPicker from '../components/PhotoPicker.tsx'
import { revokePhotoPreviews } from '../components/photoItems.ts'
import type { PhotoItem } from '../components/photoItems.ts'
import type { ProductSummary } from '../product/data.ts'
import { PHOTO_BASE_URL, PHOTO_REQUEST_MAX_COUNT, submitProductPhotoRequest } from '../product/photoRequest.ts'
import { useProductSearch } from '../product/useProducts.ts'
import { useBodyId } from '../components/useBodyId.ts'

/** 商品画像 投稿: 商品名（オートコンプリート）を選び、商品写真（複数）を投稿する */
function ImagePostPage() {
  useBodyId('MYPAGE')
  const { userId: publicId } = useParams<{ userId: string }>()
  const { user } = useUser()
  // APIには（URLの公開用IDではなく）ClerkのユーザーIDを渡す
  const userId = user?.id

  const [productName, setProductName] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedProduct, setSubmittedProduct] = useState<ProductSummary | null>(null)

  // 画像を投稿できるのは公開中の商品のみ。確定済みの商品名と一致している間は検索しない
  const trimmedProductName = productName.trim()
  const isProductConfirmed = selectedProduct !== null && selectedProduct.name === trimmedProductName
  const { candidates, isSearching } = useProductSearch(isProductConfirmed ? '' : productName, { publicOnly: true })
  const showCandidateList = !isProductConfirmed && trimmedProductName.length >= 3

  // アンマウント時にプレビュー用URLを解放するため、最新の一覧を保持する
  const photosRef = useRef<PhotoItem[]>([])

  useEffect(() => {
    photosRef.current = photos
  }, [photos])

  useEffect(() => {
    return () => revokePhotoPreviews(photosRef.current)
  }, [])

  const clearPhotos = () => {
    revokePhotoPreviews(photosRef.current)
    setPhotos([])
  }

  const handleProductNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setProductName(value)
    // 確定済みの商品名とずれたら選択を解除する
    if (selectedProduct && selectedProduct.name !== value.trim()) {
      setSelectedProduct(null)
    }
  }

  const handleSelectCandidate = (candidate: ProductSummary) => {
    setSelectedProduct(candidate)
    setProductName(candidate.name)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!userId) {
      return
    }

    if (!selectedProduct || !isProductConfirmed) {
      setSubmitError('商品名の候補から商品を選択してください。')
      return
    }

    if (photos.length === 0) {
      setSubmitError('商品写真を1枚以上選択してください。')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await submitProductPhotoRequest({
        userId,
        productId: selectedProduct.id,
        photos: photos.map((photo) => photo.file),
      })

      setSubmittedProduct(selectedProduct)
      setSelectedProduct(null)
      setProductName('')
      clearPhotos()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '商品画像の投稿に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to={`/mypage/${publicId}`}>マイページ</Link> &gt;{' '}
        <Link to={`/mypage/${publicId}/image`}>商品画像</Link> &gt;{' '}
        商品画像 投稿
      </div>

      <h1 className="heading -typeA">商品画像 投稿</h1>
      <p><Link to={`/mypage/${publicId}/image`} className="elem-link -typeA">商品画像一覧に戻る</Link></p>

      <section className="product-content">
        {submittedProduct && (
          <>
            <p className="heading -typeD">「{submittedProduct.name}」の画像を投稿しました。管理者の承認後に商品ページへ表示されます。</p>
            <p>
              <button type="button" className="elem-button -typeA" onClick={() => setSubmittedProduct(null)}>
                続けて投稿する
              </button>
            </p>
            <p><Link to={`/mypage/${publicId}/image`} className="elem-link -typeB">商品画像一覧に戻る</Link></p>
          </>
        )}

        {!submittedProduct && (
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="stack-formRow">
              <p className="elem-label"><label htmlFor="productName"><img className="icon-required" src="/assets/img/icon-required.png" />商品名</label></p>
              <div className="elem-parts">
                <input
                  id="productName"
                  type="text"
                  value={productName}
                  onChange={handleProductNameChange}
                  autoComplete="off"
                  required
                />
                <p className="elem-notes -typeA">3文字以上入力すると候補が表示されます。</p>
                {selectedProduct && isProductConfirmed && (
                  <div className="stack-selectedProduct">
                    {selectedProduct.photos[0] && (
                      <figure className="elem-img"><img src={`${PHOTO_BASE_URL}${selectedProduct.photos[0]}`} alt={selectedProduct.name} /></figure>
                    )}
                    <span>「{selectedProduct.name}」を選択中</span>
                  </div>
                )}
                {showCandidateList && (
                  <>
                    {isSearching && <p className="stack-load">検索中...</p>}
                    {!isSearching && candidates.length === 0 && (
                      <p className="stack-error">一致する商品が見つかりません。</p>
                    )}
                    {candidates.length > 0 && (
                      <ul className="list-autocomplete">
                        {candidates.map((candidate) => (
                          <li key={candidate.id} className="item" onClick={() => handleSelectCandidate(candidate)}>
                            {candidate.photos[0] && <img src={`${PHOTO_BASE_URL}${candidate.photos[0]}`} alt={candidate.name} />}
                            <span className="name">{candidate.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="stack-formRow">
              <p className="elem-label"><label htmlFor="photo"><img className="icon-required" src="/assets/img/icon-required.png" />商品写真（複数）</label></p>
              <PhotoPicker value={photos} onChange={setPhotos} maxCount={PHOTO_REQUEST_MAX_COUNT} />
            </div>

            {submitError && <p className="stack-error">{submitError}</p>}

            <div className="stack-button">
              <button type="submit" className="elem-button -typeA" disabled={isSubmitting}>
                {isSubmitting ? '送信中...' : '投稿する'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export default ImagePostPage
