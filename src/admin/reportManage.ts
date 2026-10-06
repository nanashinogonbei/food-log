// PHP API (api/admin-reports.php) から商品評価の通報を取得・更新する（管理画面 /admin/report 用）

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** pending: 有効（通報者数のカウント対象） / dismissed: 棄却（カウント対象外） */
export type ReportStatus = 'pending' | 'dismissed'

export interface ManagedReport {
  id: number
  /** 通報された評価のID。評価が削除された場合は null */
  valuationId: number | null
  productId: number
  productName: string | null
  reportedUserId: string
  reportedUserEmail: string | null
  reporterUserId: string
  scoreLabel: string
  /** 通報時点の評価コメント（通報後に修正・削除されても残る） */
  comment: string
  reason: string
  status: ReportStatus
  createdAt: string
  handledAt: string | null
  /** 通報された投稿者が受けている、有効な通報の通報者数 */
  reportedUserReporterCount: number
  /** 通報者数がしきい値以上で、投稿が制限されているか */
  isReportedUserRestricted: boolean
}

export interface ManagedReportList {
  /** 投稿制限になる通報者数（3） */
  restrictionThreshold: number
  reports: ManagedReport[]
}

/**
 * レスポンスがエラーの場合、JSONの error フィールドからメッセージを取り出す。
 */
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  const data: unknown = await response.json().catch(() => null)
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: unknown }).error)
  }
  return `${fallback} (status: ${response.status})`
}

/** 通報の一覧を取得する（有効な通報が先、新しい順）。 */
export async function fetchManagedReports(adminUserId: string): Promise<ManagedReportList> {
  const params = new URLSearchParams({ adminUserId })

  const response = await fetch(`${API_BASE_URL}/admin-reports.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '通報一覧の取得に失敗しました'))
  }

  return (await response.json()) as ManagedReportList
}

/** 通報のステータスを変更する（棄却 / 有効に戻す）。 */
export async function updateReportStatus(
  adminUserId: string,
  reportId: number,
  status: ReportStatus,
): Promise<void> {
  const body = new URLSearchParams()
  body.set('adminUserId', adminUserId)
  body.set('reportId', String(reportId))
  body.set('status', status)

  const response = await fetch(`${API_BASE_URL}/admin-reports.php`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, '通報の更新に失敗しました'))
  }
}
