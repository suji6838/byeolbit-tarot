import { useEffect, useState } from 'react'
import { ChargeRecord, listRecentCharges, revokeCharge } from '../lib/adminCharges'

export default function AdminCharges({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<ChargeRecord[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    listRecentCharges()
      .then(setRecords)
      .catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'))
  }

  useEffect(() => {
    load()
  }, [])

  const revoke = async (id: string) => {
    if (!window.confirm('결제 기록이 없는 게 확인됐나요? 코인을 회수합니다.')) return
    setBusyId(id)
    setError('')
    try {
      await revokeCharge(id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="admin-charges-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="창 닫기">×</button>
        <span className="eyebrow">관리자</span>
        <h1 id="admin-charges-title">충전 기록 감사</h1>
        <p className="auth-copy">결제 확인 없이 자동 충전되는 방식이라, 리틀리 판매내역과 대조해서 결제 기록이 없는 건 회수해 주세요.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {records === null && <p className="auth-copy">불러오는 중이에요...</p>}
        {records?.length === 0 && <p className="auth-copy">충전 기록이 없어요.</p>}
        <div className="history-list">
          {records?.map((r) => (
            <div className="history-card" key={r.id}>
              <div className="history-date">{new Date(r.createdAt).toLocaleString('ko-KR')}</div>
              <div className="history-question">{r.email}</div>
              <div className="history-question">
                {r.referenceNote} · {r.coins}코인 · {r.amount.toLocaleString()}원
              </div>
              {r.revoked ? (
                <p className="ai-error">회수됨</p>
              ) : (
                <div className="action-row">
                  <button className="secondary-button" disabled={busyId === r.id} onClick={() => revoke(r.id)}>
                    결제 기록 없음 - 회수
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
