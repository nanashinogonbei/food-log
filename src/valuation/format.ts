/**
 * 全角数字を半角に変換し、数字以外の文字を取り除く。
 * 購入金額欄で「自動で半角変換」する要件のために使う
 * (サーバー側 api/valuations.php の mb_convert_kana('n') と同等の変換)。
 */
export function toHalfWidthDigits(value: string): string {
  const halfWidth = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
  return halfWidth.replace(/[^0-9]/g, '')
}

/**
 * 日時文字列（ISO形式など）を「年月日」形式（例: 2026年9月14日）に変換する。
 * 製品ページの評価一覧で投稿日・更新日を表示するために使う。
 * 不正な日付文字列の場合は空文字を返す。
 */
export function formatJapaneseDate(dateString: string): string {
  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  return `${year}年${month}月${day}日`
}
