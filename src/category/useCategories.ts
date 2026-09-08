import { useEffect, useState } from 'react'
import { fetchCategories } from './data.ts'
import type { CategoryRecord } from './data.ts'

interface UseCategoriesResult {
  categories: CategoryRecord[]
  isLoading: boolean
  error: string | null
}

/** カテゴリー一覧をAPIから取得し、読み込み中/エラー状態も含めて返す */
export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<CategoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    fetchCategories()
      .then((data) => {
        if (isMounted) {
          setCategories(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'カテゴリーの取得に失敗しました')
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
  }, [])

  return { categories, isLoading, error }
}
