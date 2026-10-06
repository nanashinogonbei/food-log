import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { formatJapaneseDate } from '../valuation/format.ts'
import { fetchManagedReports, updateReportStatus } from './reportManage.ts'
import type { ManagedReport, ReportStatus } from './reportManage.ts'

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '有効',
  dismissed: '棄却',
}

/**
 * 通報 管理ページ (/admin/report)
 * 製品ページの商品評価に対する通報の一覧を表示する。
 * 通報された投稿者ごとの「有効な通報者数」と投稿制限中かどうかも確認できる。
 * 誤通報などは「棄却」でカウント対象から外せる（3人未満に戻れば投稿制限も自動で解除される）。
 */
function AdminReportPage() {
  const { user } = useUser()
  const adminUserId = user?.id

  const [reports, setReports] = useState<ManagedReport[]>([])
  const [threshold, setThreshold] = useState(3)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  const [showDismissed, setShowDismissed] = useState(false)
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  useEffect(() => {
    if (!adminUserId) {
      return
    }

    let isMounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    fetchManagedReports(adminUserId)
      .then((data) => {
        if (isMounted) {
          setReports(data.reports)
          setThreshold(data.restrictionThreshold)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : '通報一覧の取得に失敗しました')
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

  const handleChangeStatus = async (report: ManagedReport, status: ReportStatus) => {
    if (!adminUserId) {
      return
    }

    setUpdatingReportId(report.id)
    setUpdateError(null)

    try {
      await updateReportStatus(adminUserId, report.id, status)
      setReloadCount((count) => count + 1)
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : '通報の更新に失敗しました')
    } finally {
      setUpdatingReportId(null)
    }
  }

  const pendingCount = reports.filter((report) => report.status === 'pending').length
  const visibleReports = showDismissed ? reports : reports.filter((report) => report.status === 'pending')

  return (
    <div className="page">
      <h1 className="page__title">通報 管理</h1>

      <p>
        商品評価への通報の一覧です。有効な通報を{threshold}人以上から受けたアカウントは、
        商品申請・商品評価を投稿できなくなります。
      </p>

      <p>
        <label>
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={(event) => setShowDismissed(event.target.checked)}
          />{' '}
          棄却済みの通報も表示する
        </label>
      </p>

      {isLoading && <p>読み込み中...</p>}
      {error && <p>{error}</p>}
      {updateError && <p>{updateError}</p>}
      {!isLoading && !error && (
        <>
          <p>
            有効な通報 {pendingCount}件 / 表示中 {visibleReports.length}件
          </p>
          {visibleReports.length === 0 && <p>該当する通報はありません。</p>}

          <ul className="admin-product-list">
            {visibleReports.map((report) => (
              <li key={report.id} className="admin-product-list__item">
                <p className="admin-product-list__name">
                  <Link to={`/product/${report.productId}`}>{report.productName ?? `商品ID: ${report.productId}`}</Link>
                  <span
                    className={
                      report.status === 'pending'
                        ? 'product-list__status product-list__status--pending'
                        : 'product-list__status report-status--dismissed'
                    }
                  >
                    {STATUS_LABELS[report.status]}
                  </span>
                  {report.isReportedUserRestricted && (
                    <span className="product-list__status product-list__status--rejected">投稿制限中</span>
                  )}
                </p>

                <p className="admin-product-list__meta">
                  通報日: {formatJapaneseDate(report.createdAt)}
                  {report.handledAt && <> / 処理日: {formatJapaneseDate(report.handledAt)}</>}
                </p>
                <p className="admin-product-list__meta">
                  投稿者: {report.reportedUserEmail ?? '（メールアドレス不明）'}（{report.reportedUserId}）
                  <br />
                  この投稿者への有効な通報者数: {report.reportedUserReporterCount} / {threshold}人
                </p>
                <p className="admin-product-list__meta">通報者: {report.reporterUserId}</p>

                <p className="admin-product-list__meta">通報理由: {report.reason}</p>

                <p className="admin-product-list__meta">
                  通報された評価（{report.scoreLabel}）
                  {report.valuationId === null && <>【評価は削除済み】</>}
                </p>
                <p className="report-list__comment">{report.comment}</p>

                <p>
                  {report.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => void handleChangeStatus(report, 'dismissed')}
                      disabled={updatingReportId === report.id}
                    >
                      棄却する（誤通報）
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleChangeStatus(report, 'pending')}
                      disabled={updatingReportId === report.id}
                    >
                      有効に戻す
                    </button>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default AdminReportPage
