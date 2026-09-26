/**
 * 管理者専用ページ (/admin)
 * Clerkのprivate_metadata.authorityが"admin"のユーザーのみ表示される。
 * アクセス制御自体は RequireAdmin コンポーネント側で行っている。
 */
function AdminPage() {
  return (
    <div className="page">
      <h1 className="page__title">管理者ページ</h1>
      <p>このページは管理者のみが閲覧できます。</p>
    </div>
  )
}

export default AdminPage
