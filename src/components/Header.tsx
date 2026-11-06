import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { useCurrentUserProfile } from '../user/useUserProfile.ts'

function Header() {
  const { profile } = useCurrentUserProfile()

  return (
    <header id="l-header">
      <Link className="logo" to="/">もぐログ</Link>
      <nav className="site-header__nav">
        <SignedOut>
          <a href="/login.html">ログイン</a>
        </SignedOut>
        <SignedIn>
          {profile && <Link to={`/mypage/${profile.publicId}`}>マイページ</Link>}
          <UserButton />
        </SignedIn>
      </nav>
    </header>
  )
}

export default Header
