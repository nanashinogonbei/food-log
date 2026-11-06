// PHP API (api/users.php) からサイト用のユーザー情報を取得・更新する

export interface UserProfile {
  /** 公開用ID（URLなどに出してよいランダム文字列。ClerkのユーザーIDとは別） */
  publicId: string
  /** 表示名（未設定の間は null） */
  displayName: string | null
}

export const DISPLAY_NAME_MAX_LENGTH = 50

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) {
      return body.error
    }
  } catch {
    // JSONでない場合はフォールバックのメッセージを使う
  }
  return `${fallback} (status: ${response.status})`
}

/**
 * ユーザー情報を取得する。初回は公開用IDが自動で発行される。
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const params = new URLSearchParams({ userId })

  const response = await fetch(`${API_BASE_URL}/users.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'ユーザー情報の取得に失敗しました'))
  }

  return (await response.json()) as UserProfile
}

/**
 * 表示名を更新する。
 */
export async function updateUserDisplayName(userId: string, displayName: string): Promise<UserProfile> {
  const body = new URLSearchParams()
  body.set('userId', userId)
  body.set('displayName', displayName)

  const response = await fetch(`${API_BASE_URL}/users.php`, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'ユーザー情報の更新に失敗しました'))
  }

  return (await response.json()) as UserProfile
}

/**
 * 公開用IDからユーザーの公開情報を取得する（誰でも見られるユーザーページ用）。
 * 存在しない場合は null を返す。
 */
export async function fetchPublicUserProfile(publicId: string): Promise<UserProfile | null> {
  const params = new URLSearchParams({ publicId })

  const response = await fetch(`${API_BASE_URL}/users.php?${params.toString()}`, {
    method: 'GET',
    mode: 'cors',
    credentials: 'include',
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'ユーザー情報の取得に失敗しました'))
  }

  return (await response.json()) as UserProfile
}
