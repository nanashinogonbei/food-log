import { useEffect, useState } from 'react'
import { fetchReportedValuationIds } from './data.ts'

interface UseReportedValuationIdsResult {
  /** ログインユーザーが通報済みの評価ID */
  reportedIds: Set<number>
  /** 通報に成功した評価を「通報済み」として扱う（再取得せずに画面へ反映する） */
  markReported: (valuationId: number) => void
}

/**
 * ログインユーザーが通報済みの評価ID一覧を取得する（製品ページの「通報済み」表示用）。
 * 取得に失敗しても通報操作自体は可能（二重通報はサーバー側で防ぐ）ため、エラーは握りつぶす。
 */
export function useReportedValuationIds(userId: string | undefined): UseReportedValuationIdsResult {
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!userId) {
      return
    }

    let isMounted = true

    fetchReportedValuationIds(userId)
      .then((ids) => {
        if (isMounted) {
          setReportedIds(new Set(ids))
        }
      })
      .catch(() => {
        // 取得失敗時は「未通報」として扱う
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const markReported = (valuationId: number) => {
    setReportedIds((previous) => new Set(previous).add(valuationId))
  }

  return { reportedIds, markReported }
}
