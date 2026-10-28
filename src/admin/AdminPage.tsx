import { Link, NavLink } from 'react-router-dom'
import { useBodyId } from '../components/useBodyId.ts'

/**
 * 管理者専用ページ (/admin)
 * private_metadataではなく、あらかじめ許可したUser ID（.envのVITE_ADMIN_USER_IDS）の
 * ユーザーのみ表示される。アクセス制御自体は RequireAdmin コンポーネント側で行っている。
 */
function AdminPage() {
  useBodyId('ADMIN')
  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        管理者ページ
      </div>

      <h1 className="heading -typeA">管理者ページ</h1>
      <ul className="stack-linkLink -typeA">
        <li className="item"><NavLink to="/admin/product-approval" className={({ isActive }) => (isActive ? '-active' : '')}>商品承認 管理</NavLink></li>
        <li className="item"><NavLink to="/admin/product" className={({ isActive }) => (isActive ? '-active' : '')}>商品 管理</NavLink></li>
        <li className="item"><NavLink to="/admin/report" className={({ isActive }) => (isActive ? '-active' : '')}>通報 管理</NavLink></li>
      </ul>
    </div>
  )
}

export default AdminPage
