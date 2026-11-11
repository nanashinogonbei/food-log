import { Link, NavLink, useParams } from 'react-router-dom'
import { useClerk } from '@clerk/clerk-react'
import { useBodyId } from '../components/useBodyId.ts'

function MyPage() {
  useBodyId('MYPAGE')
  const { userId: publicId } = useParams<{ userId: string }>()
  const { signOut } = useClerk()

  // ログアウトしてトップページに戻る
  const handleSignOut = () => {
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
      </ul>
			<div className="stack-button -logout"><button type="button" className="elem-button -typeA" onClick={handleSignOut}>ログアウト</button></div>
    </div>
  )
}

export default MyPage
