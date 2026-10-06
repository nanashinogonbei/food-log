import { Link } from 'react-router-dom'

/**
 * 管理者専用ページ (/admin)
 * private_metadataではなく、あらかじめ許可したUser ID（.envのVITE_ADMIN_USER_IDS）の
 * ユーザーのみ表示される。アクセス制御自体は RequireAdmin コンポーネント側で行っている。
 */
function AdminPage() {
  return (
    <div className="page">
      <h1 className="page__title">管理者ページ</h1>
      <ul>
        <li>
          <Link to="/admin/product-approval">商品承認 管理</Link>
        </li>
        <li>
          <Link to="/admin/product">商品 管理</Link>
        </li>
        <li>
          <Link to="/admin/report">通報 管理</Link>
        </li>
      </ul>
    </div>
  )
}

export default AdminPage
