/**
 * 全角数字を半角に変換し、数字以外の文字を取り除く。
 * 購入金額欄で「自動で半角変換」する要件のために使う
 * (サーバー側 api/valuations.php の mb_convert_kana('n') と同等の変換)。
 */
export function toHalfWidthDigits(value: string): string {
  const halfWidth = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
  return halfWidth.replace(/[^0-9]/g, '')
}
