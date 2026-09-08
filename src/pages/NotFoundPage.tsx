import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="page">
      <h1 className="page__title">ページが見つかりません</h1>
      <p>
        <Link to="/">トップページに戻る</Link>
      </p>
    </div>
  )
}

export default NotFoundPage
