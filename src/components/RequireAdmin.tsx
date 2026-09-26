import type { ReactNode } from 'react'
import { useAuth } from '@clerk/clerk-react'
import NotFoundPage from '../NotFoundPage.tsx'
import { isAdminUser } from '../admin/isAdminUser.ts'

interface RequireAdminProps {
  children: ReactNode
}

/**
 * /admin を、あらかじめ許可したUser ID（.envのVITE_ADMIN_USER_IDS）のユーザーだけに表示する。
 * private_metadataはセッショントークンに含められない仕様のため、
 * ログイン中のuserIdをホワイトリストと突き合わせる方式にしている。
 *
 * 許可されていないユーザー（未ログイン含む）には404ページを表示する。
 * /adminというURLの存在自体を一般ユーザーに知らせないため、リダイレクトではなく404にしている。
 */
function RequireAdmin({ children }: RequireAdminProps) {
  const { isLoaded, userId } = useAuth()

  if (!isLoaded) {
    return null
  }

  if (!isAdminUser(userId)) {
    return <NotFoundPage />
  }

  return <>{children}</>
}

export default RequireAdmin
