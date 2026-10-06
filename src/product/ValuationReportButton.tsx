import { useState } from 'react'
import { REPORT_REASON_MAX_LENGTH, submitReport } from '../report/data.ts'

interface ValuationReportButtonProps {
  valuationId: number
  reporterUserId: string
  /** 既に通報済みの評価かどうか */
  isReported: boolean
  /** 通報に成功したら、通報済みとして扱うよう親に伝える */
  onReported: (valuationId: number) => void
}

/**
 * 製品ページの各評価に表示する「通報する」ボタン。
 * 押すと通報理由（必須）の入力欄が開き、送信すると管理者（/admin/report）に通報が届く。
 * 通報済みの評価には「通報済み」と表示する。
 */
function ValuationReportButton({ valuationId, reporterUserId, isReported, onReported }: ValuationReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isReported) {
    return <span className="report-form__done">通報済み</span>
  }

  if (!isOpen) {
    return (
      <button type="button" className="report-button" onClick={() => setIsOpen(true)}>
        通報する
      </button>
    )
  }

  const trimmedReason = reason.trim()

  const handleSubmit = async () => {
    if (trimmedReason === '') {
      setError('通報理由を入力してください。')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await submitReport({ reporterUserId, valuationId, reason: trimmedReason })
      onReported(valuationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : '通報の送信に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setIsOpen(false)
    setReason('')
    setError(null)
  }

  return (
    <span className="report-form">
      <label htmlFor={`report-reason-${valuationId}`}>
        この評価を不適切な投稿として管理者に通報します。通報理由を入力してください（必須）。
      </label>
      <textarea
        id={`report-reason-${valuationId}`}
        value={reason}
        maxLength={REPORT_REASON_MAX_LENGTH}
        rows={3}
        required
        aria-required="true"
        onChange={(event) => setReason(event.target.value)}
        disabled={isSubmitting}
      />
      {error && <span className="report-form__error">{error}</span>}
      <span className="report-form__buttons">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || trimmedReason === ''}
        >
          {isSubmitting ? '送信中...' : '通報を送信する'}
        </button>{' '}
        <button type="button" onClick={handleCancel} disabled={isSubmitting}>
          キャンセル
        </button>
      </span>
    </span>
  )
}

export default ValuationReportButton
