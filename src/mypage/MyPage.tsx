import { NavLink, useParams } from 'react-router-dom'

function MyPage() {
  const { userId } = useParams<{ userId: string }>()

  return (
    <div id="l-content">
      <h1 className="heading -typeA">マイページ</h1>
      <p>
        ユーザーID: <strong>{userId}</strong>
      </p>
      <ul className="stack-linkLink -typeA">
        <li className="item"><NavLink to={`/${userId}/request`} className={({ isActive }) => (isActive ? '-active' : '')}>商品申請</NavLink></li>
        <li className="item"><NavLink to={`/${userId}/valuation`} className={({ isActive }) => (isActive ? '-active' : '')}>商品評価</NavLink></li>
      </ul>
    </div>
  )
}

export default MyPage
