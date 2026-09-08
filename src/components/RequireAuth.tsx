import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth, useUser } from '@clerk/clerk-react'
import NotFoundPage from '../NotFoundPage.tsx'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * ログインしていない場合は /login.html にリダイレクトする。
 * ログイン済みでも、URL中の userId が自分自身のIDと一致しない場合は
 * 404ページを表示する（/[userID]/ 配下は本人のIDのみ有効なURL）。
 */
function RequireAuth({ children }: RequireAuthProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()
  const { userId } = useParams<{ userId: string }>()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/login.html'
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded || !isSignedIn) {
    return null
  }

  if (userId !== user?.id) {
    return <NotFoundPage />
  }

  return <>{children}</>
}

export default RequireAuth
