import { Link, NavLink, useParams } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import type { MouseEvent } from 'react'
import { useBodyId } from '../components/useBodyId.ts'

function MyPage() {
  useBodyId('MYPAGE')
  const { userId: publicId } = useParams<{ userId: string }>()
  const { signOut } = useClerk()

  // ログアウトしてトップページに戻る
  const handleSignOut = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    void signOut({ redirectUrl: '/' })
  }

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        マイページ
      </div>

      <h1 className="heading -typeA">マイページ</h1>
      <ul className="stack-linkLink -typeA">
				<li className="item"><NavLink to={`/mypage/${publicId}/user`} className={({ isActive }) => (isActive ? '-active' : '')}>ユーザー情報 編集</NavLink></li>
        <li className="item"><NavLink to={`/mypage/${publicId}/request`} className={({ isActive }) => (isActive ? '-active' : '')}>商品申請</NavLink></li>
        <li className="item"><NavLink to={`/mypage/${publicId}/valuation`} className={({ isActive }) => (isActive ? '-active' : '')}>商品評価</NavLink></li>
        <li className="item"><a href="/" onClick={handleSignOut}>ログアウト</a></li>
      </ul>
    </div>
  )
}

export default MyPage
