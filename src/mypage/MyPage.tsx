import { NavLink, useParams } from 'react-router-dom'

function MyPage() {
  const { userId } = useParams<{ userId: string }>()

  return (
    <div className="page">
      <h1 className="page__title">マイページ</h1>
      <p>
        ユーザーID: <strong>{userId}</strong>
      </p>

      <nav className="mypage-tabs">
        <NavLink to={`/${userId}/request`} className={({ isActive }) => (isActive ? 'active' : '')}>
          商品申請
        </NavLink>
        <NavLink to={`/${userId}/valuation`} className={({ isActive }) => (isActive ? 'active' : '')}>
          商品評価
        </NavLink>
      </nav>
      {/* TODO: プロフィール情報や活動履歴などを表示 */}
    </div>
  )
}

export default MyPage
