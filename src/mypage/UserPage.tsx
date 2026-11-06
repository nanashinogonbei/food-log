import { useUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useBodyId } from '../components/useBodyId.ts'
import { DISPLAY_NAME_MAX_LENGTH, fetchUserProfile, updateUserDisplayName } from '../user/data.ts'

/** マイページのユーザー情報 編集: 表示名の編集と、公開用IDの確認ができる */
function UserPage() {
  useBodyId('MYPAGE')
  const { userId: routePublicId } = useParams<{ userId: string }>()
  const { user } = useUser()
  // APIには（URLの公開用IDではなく）ClerkのユーザーIDを渡す
  const userId = user?.id

  const [publicId, setPublicId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    if (!userId) {
      return
    }

    let isMounted = true

    fetchUserProfile(userId)
      .then((profile) => {
        if (isMounted) {
          setPublicId(profile.publicId)
          setDisplayName(profile.displayName ?? '')
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!userId) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      const profile = await updateUserDisplayName(userId, displayName)
      setDisplayName(profile.displayName ?? '')
      setSubmitSuccess(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div id="l-content">
      <div id="l-breadcrumb">
        <Link to="/">HOME</Link> &gt;{' '}
        <Link to={`/mypage/${routePublicId}`}>マイページ</Link> &gt;{' '}
        ユーザー情報 編集
      </div>

      <h1 className="heading -typeA">ユーザー情報 編集</h1>

      {isLoading && <p>読み込み中...</p>}
      {!isLoading && !loadError && publicId && (
        <p><Link to={`/user/${publicId}`} className="elem-link -typeA">あなたの評価一覧（公開ページ）を見る</Link></p>
      )}
      {loadError && <p className="stack-error">{loadError}</p>}

      {!isLoading && !loadError && (
        <form className="product-form" onSubmit={handleSubmit}>
          <div className="stack-formRow">
            <p className="elem-label"><label htmlFor="publicId">ID</label></p>
            <div className="elem-parts">
              <input id="publicId" type="text" value={publicId} disabled />
            </div>
          </div>

          <div className="stack-formRow">
            <p className="elem-label">
              <label htmlFor="displayName"><img className="icon-required" src="/assets/img/icon-required.png" />表示名</label>
            </p>
            <div className="elem-parts">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value)
                  setSubmitSuccess(false)
                }}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                autoComplete="off"
                required
              />
              <p className="elem-notes -typeA">{DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください。</p>
            </div>
          </div>

          {submitError && <p className="stack-error">{submitError}</p>}
          {submitSuccess && <p>ユーザー情報を更新しました。</p>}

          <div className="stack-button">
            <button type="submit" className="elem-button -typeA" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存する'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default UserPage
