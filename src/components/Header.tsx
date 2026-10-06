import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react'

function Header() {
  const { user } = useUser()

  return (
    <header id="l-header">
      <Link className="logo" to="/">もぐログ</Link>
      <nav className="site-header__nav">
        <SignedOut>
          <a href="/login.html">ログイン</a>
        </SignedOut>
        <SignedIn>
          {user && <Link to={`/${user.id}`}>マイページ</Link>}
          <UserButton />
        </SignedIn>
      </nav>
    </header>
  )
}

export default Header
