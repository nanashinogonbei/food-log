import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { fetchUserProfile } from './data.ts'
import type { UserProfile } from './data.ts'

// ClerkのユーザーIDごとにプロフィール取得をキャッシュする（ヘッダー・各ページで同時に使っても取得は1回）
const profileRequests = new Map<string, Promise<UserProfile>>()

function loadUserProfile(clerkUserId: string): Promise<UserProfile> {
  let request = profileRequests.get(clerkUserId)

  if (!request) {
    request = fetchUserProfile(clerkUserId)
    profileRequests.set(clerkUserId, request)
    // 失敗した場合は次回また取得し直せるようにする
    request.catch(() => profileRequests.delete(clerkUserId))
  }

  return request
}

interface UseCurrentUserProfileResult {
  /** ログイン中ユーザーのサイト用プロフィール（公開用IDなど）。未取得の間は null */
  profile: UserProfile | null
  /** ログイン状態の判定中、またはプロフィール取得中 */
  isLoading: boolean
  error: string | null
}

/**
 * ログイン中ユーザーのサイト用プロフィール（公開用ID・表示名）を取得する。
 * URLにはClerkのIDではなく、ここで得られる公開用ID(publicId)を使う。
 * 初回は公開用IDが自動で発行される。
 */
export function useCurrentUserProfile(): UseCurrentUserProfileResult {
  const { user, isLoaded } = useUser()
  const clerkUserId = user?.id
  const [result, setResult] = useState<{ clerkUserId: string; profile?: UserProfile; error?: string } | null>(null)

  useEffect(() => {
    if (!clerkUserId) {
      return
    }

    let isMounted = true

    loadUserProfile(clerkUserId)
      .then((profile) => {
        if (isMounted) {
          setResult({ clerkUserId, profile })
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setResult({
            clerkUserId,
            error: err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました',
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [clerkUserId])

  // ログアウト・ユーザー切り替え後に前のユーザーの結果を使わない
  const current = result && result.clerkUserId === clerkUserId ? result : null

  return {
    profile: current?.profile ?? null,
    isLoading: !isLoaded || (clerkUserId !== undefined && current === null),
    error: current?.error ?? null,
  }
}
