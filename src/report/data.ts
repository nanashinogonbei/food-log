// PHP API (api/reports.php) へ商品評価の通報を送信・取得する

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** 通報理由の最大文字数（api/reports.php の REPORT_REASON_MAX_LENGTH と合わせる） */
export const REPORT_REASON_MAX_LENGTH = 500

export interface ReportPayload {
  reporterUserId: string
  valuationId: number
  /** 通報理由（必須） */
  reason: string
}

/**
 * 指定した評価を不適切な投稿として通報する（製品ページの「通報する」用）。
 * 既に通報済み(409)の場合は、通報済みという目的は達成されているため成功として扱う。
 */
export async function submitReport(payload: ReportPayload): Promise<void> {
  const body = new URLSearchParams()
  body.set('reporterUserId', payload.reporterUserId)
  body.set('valuationId', String(payload.valuationId))
  body.set('reason', payload.reason)

  const response = await fetch(`${API_BASE_URL}/reports.php`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (response.status === 409) {
    return
  }

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `通報の送信に失敗しました (status: ${response.status})`
    throw new Error(message)
  }
}

/**
 * 指定したユーザーが通報済みの評価ID一覧を取得する（「通報済み」表示用）。
 */
export async function fetchReportedValuationIds(reporterUserId: string): Promise<number[]> {
  const params = new URLSearchParams({ reporterUserId })

  const response = await fetch(`${API_BASE_URL}/reports.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    cache: 'no-store',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`通報済みの評価の取得に失敗しました (status: ${response.status})`)
  }

  return (await response.json()) as number[]
}
