import { FormEvent, useEffect, useState } from 'react'
import { COIN_PACKAGE, LITT_PRODUCT_URL } from '../config'
import { ChargeRequest, listMyPendingChargeRequests, submitChargeRequest } from '../lib/charge'

export default function ChargeModal({ onClose, onCharged }: { onClose: () => void; onCharged: () => void }) {
  const [referenceNote, setReferenceNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState<ChargeRequest[] | null>(null)

  useEffect(() => {
    listMyPendingChargeRequests().then(setPending)
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!referenceNote.trim()) {
      setError('입금자명 또는 주문번호를 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      await submitChargeRequest(referenceNote)
      setNotice('충전 요청을 보냈어요. 확인 후 코인이 지급돼요.')
      setReferenceNote('')
      setPending(await listMyPendingChargeRequests())
      onCharged()
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
          <a className="google-button" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }} href={LITT_PRODUCT_URL} target="_blank" rel="noreferrer">
            결제 페이지 열기 (새 탭)
          </a>
        </div>
        <form onSubmit={submit} noValidate>
          <label>
            2. 결제 후 입금자명 또는 주문번호를 입력해 주세요
            <input
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="예: 홍길동 또는 주문번호"
              maxLength={100}
            />
          </label>
          {notice && <p className="auth-copy" role="status">{notice}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="google-button" type="submit" disabled={submitting}>
            {submitting ? '요청 중이에요' : '충전 요청하기'}
          </button>
        </form>
        <p className="auth-note">확인까지 시간이 걸릴 수 있어요. 요청 후 아래에서 대기 중인 요청을 확인할 수 있어요.</p>

        {pending && pending.length > 0 && (
          <div className="history-list" style={{ marginTop: 20 }}>
            {pending.map((r) => (
              <div className="history-card" key={r.id}>
                <div className="history-date">
                  {new Date(r.createdAt).toLocaleString('ko-KR')} · {r.coins}코인 · {r.amount.toLocaleString()}원
                </div>
                <div className="history-question">{r.referenceNote}</div>
                <div className="history-cards">
                  <span>확인 중</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
