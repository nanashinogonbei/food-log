import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useCurrentUserProfile } from './useUserProfile.ts'

/**
 * アカウント作成直後の遷移先 (/signup-complete)。
 *
 * サイト用のユーザー情報(usersテーブル)に登録して公開用IDを発行し、
 * ユーザー情報 編集ページ (/mypage/[userID]/user) に移動する。
 * 登録は api/users.php の初回アクセス時の自動作成で行われる。
 */
function SignUpCompletePage() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useAuth()
  const { profile, error } = useCurrentUserProfile()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href = '/login.html'
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    if (profile) {
      navigate(`/mypage/${profile.publicId}/user`, { replace: true })
    }
  }, [profile, navigate])

  return (
    <div id="l-content">
      {error ? <p className="stack-error">{error}</p> : <p>アカウントを作成しています...</p>}
    </div>
  )
}

export default SignUpCompletePage
