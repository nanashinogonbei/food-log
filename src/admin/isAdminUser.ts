// 管理者として許可するClerkのUser ID一覧。
// .env の VITE_ADMIN_USER_IDS にカンマ区切りで設定する（例: "user_abc,user_def"）。
const ADMIN_USER_IDS: string[] = String(import.meta.env.VITE_ADMIN_USER_IDS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter((id) => id !== '')

/**
 * ログイン中のuserIdが管理者ホワイトリストに含まれているかどうかを判定する。
 */
export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) {
    return false
  }

  return ADMIN_USER_IDS.includes(userId)
}
