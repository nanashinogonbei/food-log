import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { fetchAdminPhotoRequests, reviewAdminPhotoRequest } from './productPhotoRequests.ts'
import type { AdminPhotoRequest, PhotoRequestAction } from './productPhotoRequests.ts'
import { PHOTO_BASE_URL } from '../product/photoRequest.ts'
import { formatJapaneseDate } from '../valuation/format.ts'
import { useBodyId } from '../components/useBodyId.ts'

/**
 * 商品画像 管理ページ (/admin/image)
 * 商品ページの「この商品の画像を投稿する」から申請された画像（承認待ち）を一覧表示し、
 * 「承認」（商品ページに表示）または「却下」（画像を削除）する。
 */
function AdminImagePage() {
  useBodyId('ADMIN')
  const { user } = useUser()
  const adminUserId = user?.id

  const [requests, setRequests] = useState<AdminPhotoRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  // 処理中の申請ID（二重クリック防止）
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (!adminUserId) {
      return
    }

    let isMounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    fetchAdminPhotoRequests(adminUserId)
      .then((data) => {
        if (isMounted) {
          setRequests(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '画像申請一覧の取得に失敗しました')
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
  }, [adminUserId, reloadCount])

  const handleReview = async (request: AdminPhotoRequest, action: PhotoRequestAction) => {
    if (!adminUserId || processingId !== null) {
      return
    }
    if (action === 'reject' && !window.confirm('この画像を却下しますか？（画像は削除されます）')) {
      return
    }

    setProcessingId(request.id)
    setActionError(null)

    try {
      await reviewAdminPhotoRequest(adminUserId, request.id, action)
      // 処理した申請は一覧から外す
      setRequests((current) => current.filter((item) => item.id !== request.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '処理に失敗しました')
      // 他の管理者が先に処理していた場合などに備えて、一覧を取得し直す
      setReloadCount((count) => count + 1)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to="/admin">管理者ページ</Link> &gt;{' '}
        商品画像 管理
      </div>

      <h1 className="heading -typeA">商品画像 管理</h1>

      <section className="product-content">
        <h2 className="heading -typeB">
          承認待ちの画像
          {!isLoading && !error && <span className="count">（全{requests.length}件）</span>}
        </h2>

        {isLoading && <p>読み込み中...</p>}
        {error && <p>{error}</p>}
        {actionError && <p className="stack-error">{actionError}</p>}
        {!isLoading && !error && requests.length === 0 && <p>承認待ちの画像はありません。</p>}

        {!isLoading && !error && requests.length > 0 && (
          <ul className="stack-photoRequests">
            {requests.map((request) => (
              <li key={request.id} className="item">
                <figure className="elem-photo">
                  <a href={`${PHOTO_BASE_URL}${request.url}`} target="_blank" rel="noreferrer">
                    <img src={`${PHOTO_BASE_URL}${request.url}`} alt={`${request.productName}の申請画像`} loading="lazy" />
                  </a>
                  <figcaption>{formatJapaneseDate(request.createdAt)} 申請</figcaption>
                </figure>
                <div className="cluster-info">
                  <p className="elem-name">
                    <Link to={`/product/${request.productId}`} className="elem-link" target="_blank">{request.productName}</Link>
                  </p>
                  <p className="elem-metaUser">
                    申請者: <Link to={`/user/${request.requestedBy}`} className="elem-link" target="_blank">{request.requestedBy}</Link>
                  </p>
                  <div className="stack-actions">
                    <button
                      type="button"
                      className="elem-button -typeA"
                      disabled={processingId !== null}
                      onClick={() => handleReview(request, 'approve')}
                    >
                      承認
                    </button>
                    <button
                      type="button"
                      className="elem-button -typeA -reject"
                      disabled={processingId !== null}
                      onClick={() => handleReview(request, 'reject')}
                    >
                      却下
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default AdminImagePage
