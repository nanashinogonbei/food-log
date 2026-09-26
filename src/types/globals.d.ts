export {}

// Clerkダッシュボードの「Sessions > Customize session token」で
// private_metadata.authority をセッショントークンのカスタムクレームとして
// 追加している前提の型定義。
// 参考: https://clerk.com/docs/guides/sessions/customize-session-tokens
declare global {
  interface CustomJwtSessionClaims {
    authority?: string
  }
}
