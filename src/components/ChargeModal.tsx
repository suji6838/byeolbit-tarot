import { FormEvent, useState } from 'react'
import { COIN_PACKAGE, LITT_PRODUCT_URL } from '../config'
import { submitChargeRequest } from '../lib/charge'
import { useEscapeKey } from '../lib/useEscapeKey'

export default function ChargeModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose)
  const [visitedPaymentPage, setVisitedPaymentPage] = useState(false)
  const [referenceNote, setReferenceNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [completed, setCompleted] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (completed) return
    if (!visitedPaymentPage) {
      setError('먼저 결제 페이지로 이동해서 결제를 진행해 주세요.')
      return
    }
    if (!referenceNote.trim()) {
      setError('입금자명을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      await submitChargeRequest(referenceNote)
      setNotice('결제 확인 요청을 보냈어요. 관리자가 확인하면 코인이 충전돼요.')
      setReferenceNote('')
      setCompleted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="charge-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="창 닫기">×</button>
        <span className="eyebrow">코인 충전</span>
        <h1 id="charge-title">코인 {COIN_PACKAGE.coins}개<br /><em>{COIN_PACKAGE.amount.toLocaleString()}원</em></h1>
        <p className="auth-copy">
          아래 순서대로 진행해 주세요.
        </p>
        <div className="consent-box">
          <p className="consent-title">1. 결제 페이지로 이동해서 결제해 주세요</p>
          <a
            className="google-button"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
            href={LITT_PRODUCT_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => setVisitedPaymentPage(true)}
          >
            결제 페이지 열기 (새 탭)
          </a>
        </div>
        <form onSubmit={submit} noValidate>
          <label>
            2. 결제하셨다면 입금자명을 입력해 주세요 (관리자 확인 후 코인이 충전돼요)
            <input
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="예: 홍길동"
              maxLength={100}
              disabled={!visitedPaymentPage || completed}
            />
          </label>
          {!visitedPaymentPage && <p className="hint">1번 결제 페이지를 먼저 열어야 입력할 수 있어요.</p>}
          {notice && <p className="auth-copy" role="status">{notice}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {completed ? (
            <button type="button" className="google-button" onClick={onClose}>확인</button>
          ) : (
            <button className="google-button" type="submit" disabled={submitting || !visitedPaymentPage}>
              {submitting ? '요청하는 중이에요' : '결제 확인 요청하기'}
            </button>
          )}
        </form>
        <p className="auth-note">관리자가 리틀리 결제 내역과 대조해 승인하면 코인이 자동으로 지급돼요. 보통 영업일 기준 하루 이내에 처리돼요.</p>
      </section>
    </div>
  )
}
