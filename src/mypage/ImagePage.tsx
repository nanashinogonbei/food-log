import { useUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PHOTO_BASE_URL, fetchUserProductPhotos } from '../product/photoRequest.ts'
import type { UserProductPhoto } from '../product/photoRequest.ts'
import { formatJapaneseDate } from '../valuation/format.ts'
import { useBodyId } from '../components/useBodyId.ts'

const STATUS_LABELS: Record<UserProductPhoto['status'], string> = {
  pending: '承認待ち',
  approved: '公開中',
  rejected: '却下',
}

const PAGE_SIZE = 12

/** マイページの商品画像タブ: ログインユーザー自身が投稿した商品画像の一覧を表示する */
function ImagePage() {
  useBodyId('MYPAGE')
  const { userId: publicId } = useParams<{ userId: string }>()
  const { user } = useUser()
  // APIには（URLの公開用IDではなく）ClerkのユーザーIDを渡す
  const userId = user?.id
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<UserProductPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    if (!userId) {
      return
    }

    let isMounted = true

    fetchUserProductPhotos(userId)
      .then((data) => {
        if (isMounted) {
          setPhotos(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '投稿した画像の取得に失敗しました')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const visiblePhotos = photos.slice(0, visibleCount)
  const hasMore = visibleCount < photos.length

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to={`/mypage/${publicId}`}>マイページ</Link> &gt;{' '}
        商品画像
      </div>

      <h1 className="heading -typeA">商品画像</h1>
      <button
        type="button"
        className="elem-button -typeA"
        onClick={() => navigate(`/mypage/${publicId}/image/post`)}
      >
        商品画像を投稿する
      </button>

      <section className="product-content">
        <h2 className="heading -typeB">
          投稿した商品画像
          {!isLoading && !error && <span className="count">（全{photos.length}件）</span>}
        </h2>
        {isLoading && <p>読み込み中...</p>}
        {error && <p className="stack-error">{error}</p>}
        {!isLoading && !error && photos.length === 0 && <p className="stack-error">まだ商品画像を投稿していません。</p>}

        <ul className="list-image">
          {visiblePhotos.map((photo) => (
            <li key={photo.id} className={`item -${photo.status}`}>
              <figure>
                {photo.url ? (
                  <img src={`${PHOTO_BASE_URL}${photo.url}`} alt={photo.productName} />
                ) : (
                  <span className="elem-noImage">却下された画像</span>
                )}
              </figure>
              <div className="cluster-txt">
                <p className="name">
                  <Link to={`/product/${photo.productId}`} className="elem-link -typeA">{photo.productName}</Link>
                </p>
                <p className="date">{formatJapaneseDate(photo.createdAt)} 投稿</p>
              </div>
              {photo.status !== 'approved' && <span className="status">{STATUS_LABELS[photo.status]}</span>}
            </li>
          ))}
        </ul>

        {hasMore && (
          <p>
            <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
              もっと見る
            </button>
          </p>
        )}
      </section>
    </div>
  )
}

export default ImagePage
