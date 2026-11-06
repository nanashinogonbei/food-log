import { Link, NavLink, useParams } from 'react-router-dom'
import { useBodyId } from '../components/useBodyId.ts'

function MyPage() {
  useBodyId('MYPAGE')
  const { userId } = useParams<{ userId: string }>()

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        マイページ
      </div>

      <h1 className="heading -typeA">マイページ</h1>
      <ul className="stack-linkLink -typeA">
				<li className="item"><NavLink to={`/mypage/${userId}/user`} className={({ isActive }) => (isActive ? '-active' : '')}>ユーザー情報 編集</NavLink></li>
        <li className="item"><NavLink to={`/mypage/${userId}/request`} className={({ isActive }) => (isActive ? '-active' : '')}>商品申請</NavLink></li>
        <li className="item"><NavLink to={`/mypage/${userId}/valuation`} className={({ isActive }) => (isActive ? '-active' : '')}>商品評価</NavLink></li>
      </ul>
    </div>
  )
}

export default MyPage
