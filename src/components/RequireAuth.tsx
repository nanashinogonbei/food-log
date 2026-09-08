import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * ログインしていない場合は /login.html にリダイレクトし、
 * ログイン確認が取れるまで・未ログイン時は children を描画しない。
 */
function RequireAuth({ children }: RequireAuthProps) {
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/login.html'
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded || !isSignedIn) {
    return null
  }

  return <>{children}</>
}

export default RequireAuth
