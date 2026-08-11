import { FormEvent, useState } from 'react'
import { COIN_PACKAGE, LITT_PRODUCT_URL } from '../config'
import { submitChargeRequest } from '../lib/charge'

export default function ChargeModal({ onClose, onCharged }: { onClose: () => void; onCharged: (coins: number) => void }) {
  const [visitedPaymentPage, setVisitedPaymentPage] = useState(false)
  const [referenceNote, setReferenceNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!visitedPaymentPage) {
      setError('먼저 결제 페이지로 이동해서 결제를 진행해 주세요.')
      return
    }
    if (!referenceNote.trim()) {
      setError('입금자명 또는 주문번호를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      const newBalance = await submitChargeRequest(referenceNote, COIN_PACKAGE.coins, COIN_PACKAGE.amount)
      setNotice(`코인 ${COIN_PACKAGE.coins}개가 충전됐어요! (현재 잔액 ${newBalance}개)`)
      setReferenceNote('')
      onCharged(newBalance)
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
            2. 결제하셨다면 입금자명 또는 주문번호를 입력해 주세요
            <input
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="예: 홍길동 또는 주문번호"
              maxLength={100}
              disabled={!visitedPaymentPage}
            />
          </label>
          {!visitedPaymentPage && <p className="hint">1번 결제 페이지를 먼저 열어야 입력할 수 있어요.</p>}
          {notice && <p className="auth-copy" role="status">{notice}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="google-button" type="submit" disabled={submitting || !visitedPaymentPage}>
            {submitting ? '확인하는 중이에요' : '결제 확인하고 코인 받기'}
          </button>
        </form>
        <p className="auth-note">입력하신 정보는 실제 결제 여부를 나중에 확인하는 용도로 기록돼요. 결제 없이 임의로 입력하면 코인이 회수될 수 있어요.</p>
      </section>
    </div>
  )
}
