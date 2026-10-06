import { useEffect } from 'react'

/**
 * ページ表示中だけ <body> の id を指定した値にする。
 * ページ離脱時に元の id へ戻す。
 */
export function useBodyId(id: string) {
  useEffect(() => {
    const previousId = document.body.id
    document.body.id = id

    return () => {
      document.body.id = previousId
    }
  }, [id])
}
