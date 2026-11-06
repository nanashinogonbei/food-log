import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { formatJapaneseDate } from '../valuation/format.ts'
import { fetchManagedReports, updateReportStatus } from './reportManage.ts'
import type { ManagedReport, ReportStatus } from './reportManage.ts'
import { useBodyId } from '../components/useBodyId.ts'

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
  useBodyId('ADMIN')
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
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to="/admin">管理者ページ</Link> &gt;{' '}
        通報 管理
      </div>

      <h1 className="heading -typeA">通報 管理</h1>
			<p className="_txt">
				商品評価への通報の一覧です。<br />
				有効な通報を{threshold}人以上から受けたアカウントは、商品申請・商品評価を投稿できなくなります。
			</p>

      <section className="product-content">

        <p className="stack-reportLeadCheckbox">
          <label>
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={(event) => setShowDismissed(event.target.checked)}
            />{' '}
            棄却済みの通報も表示する
          </label>
        </p>

        <h2 className="heading -typeB">
          通報一覧
          {!isLoading && !error && (
            <span className="count">（有効 {pendingCount}件 / 表示中 {visibleReports.length}件）</span>
          )}
        </h2>
        {isLoading && <p>読み込み中...</p>}
        {error && <p>{error}</p>}
        {updateError && <p>{updateError}</p>}
        {!isLoading && !error && visibleReports.length === 0 && <p>該当する通報はありません。</p>}
        {!isLoading && !error && (
        <>

          <ul className="product-listApplication">
            {visibleReports.map((report) => (
              <li key={report.id} className="item">
								<div className="inner">
								
									<p className="elem-name">
										<Link to={`/product/${report.productId}`}>{report.productName ?? `商品ID: ${report.productId}`}</Link>
										<span
											className={
												report.status === 'pending'
													? 'elem-status -pending'
													: 'elem-status -dismissed'
											}
										>
											（{STATUS_LABELS[report.status]}）
										</span>
										{report.isReportedUserRestricted && (
											<span className="product-list__status product-list__status--rejected">投稿制限中</span>
										)}
									</p>

									<table className="table -typeA">
										<tbody>
											<tr>
												<th>通報日</th>
												<td>{formatJapaneseDate(report.createdAt)}</td>
											</tr>
											{report.handledAt && (
											<tr>
												<th>処理日</th>
												<td>{formatJapaneseDate(report.handledAt)}</td>
											</tr>
											)}
											<tr>
												<th>投稿者</th>
												<td>{report.reportedUserEmail ?? '（メールアドレス不明）'}（{report.reportedUserId}）</td>
											</tr>
											<tr>
												<th>この投稿者への有効な通報者数</th>
												<td>{report.reportedUserReporterCount} / {threshold}人</td>
											</tr>
											<tr>
												<th>通報者</th>
												<td>{report.reporterUserId}</td>
											</tr>
											<tr>
												<th>通報理由</th>
												<td>{report.reason}</td>
											</tr>
											<tr>
												<th>通報された評価（{report.scoreLabel}）</th>
												<td>{report.valuationId === null && <>【評価は削除済み】</>}{report.comment}</td>
											</tr>
										</tbody>
									</table>

								</div>
								
								<div className="stack-button">
									{report.status === 'pending' ? (
										<button
											type="button"
											className="elem-button -typeA"
											onClick={() => void handleChangeStatus(report, 'dismissed')}
											disabled={updatingReportId === report.id}
										>
											棄却する（誤通報）
										</button>
									) : (
										<button
											type="button"
											className="elem-button -typeA"
											onClick={() => void handleChangeStatus(report, 'pending')}
											disabled={updatingReportId === report.id}
										>
											有効に戻す
										</button>
									)}
								</div>
								
              </li>
            ))}
          </ul>
        </>
        )}
      </section>
    </div>
  )
}

export default AdminReportPage
