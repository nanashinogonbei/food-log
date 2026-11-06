import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import NotFoundPage from '../NotFoundPage.tsx'
import { useCurrentUserProfile } from '../user/useUserProfile.ts'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * ログインしていない場合は /login.html にリダイレクトする。
 * ログイン済みでも、URL中の userId（公開用ID）が自分自身の公開用IDと一致しない場合は
 * 404ページを表示する（/mypage/[userID]/ 配下は本人の公開用IDのみ有効なURL）。
 */
function RequireAuth({ children }: RequireAuthProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const { profile, isLoading: isProfileLoading, error: profileError } = useCurrentUserProfile()
  const { userId } = useParams<{ userId: string }>()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/login.html'
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded || !isSignedIn) {
    return null
  }

  if (isProfileLoading) {
    return null
  }

  if (profileError) {
    return <p>{profileError}</p>
  }

  // URL中の userId は公開用ID。本人の公開用IDと一致しない場合は404にする
  if (userId !== profile?.publicId) {
    return <NotFoundPage />
  }

  return <>{children}</>
}

export default RequireAuth
