import { useEffect, useState } from 'react'
import { PendingCharge, listPendingCharges, reviewCharge } from '../lib/adminCharges'

export default function AdminCharges({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState<PendingCharge[] | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () => {
    listPendingCharges()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : '불러오기 실패'))
  }

  useEffect(() => {
    load()
  }, [])

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id)
    setError('')
    try {
      await reviewCharge(id, action)
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
        <h1 id="admin-charges-title">충전 요청 승인</h1>
        {error && <p className="form-error" role="alert">{error}</p>}
        {requests === null && <p className="auth-copy">불러오는 중이에요...</p>}
        {requests?.length === 0 && <p className="auth-copy">대기 중인 요청이 없어요.</p>}
        <div className="history-list">
          {requests?.map((r) => (
            <div className="history-card" key={r.id}>
              <div className="history-date">{new Date(r.createdAt).toLocaleString('ko-KR')}</div>
              <div className="history-question">{r.email}</div>
              <div className="history-question">
                {r.referenceNote} · {r.coins}코인 · {r.amount.toLocaleString()}원
              </div>
              <div className="action-row">
                <button className="secondary-button" disabled={busyId === r.id} onClick={() => act(r.id, 'approve')}>
                  승인
                </button>
                <button className="secondary-button" disabled={busyId === r.id} onClick={() => act(r.id, 'reject')}>
                  반려
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
