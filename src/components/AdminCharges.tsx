import { useEffect, useState } from 'react'
import { ChargeRecord, approveCharge, listRecentCharges, rejectCharge, revokeCharge } from '../lib/adminCharges'
import { useEscapeKey } from '../lib/useEscapeKey'

const statusLabel: Record<ChargeRecord['status'], string> = {
  pending: '대기중',
  approved: '승인됨',
  rejected: '거절됨',
}

export default function AdminCharges({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose)
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

  const runAction = async (id: string, confirmMessage: string | null, action: (id: string) => Promise<void>) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    setBusyId(id)
    setError('')
    try {
      await action(id)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setBusyId(null)
    }
  }

  const pending = records?.filter((r) => r.status === 'pending') ?? []
  const processed = records?.filter((r) => r.status !== 'pending') ?? []

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="admin-charges-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="창 닫기">×</button>
        <span className="eyebrow">관리자</span>
        <h1 id="admin-charges-title">충전 요청 승인</h1>
        <p className="auth-copy">리틀리 판매내역과 대조한 뒤 결제가 확인되면 승인, 확인이 안 되면 거절해 주세요.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        {records === null && <p className="auth-copy">불러오는 중이에요...</p>}
        {records?.length === 0 && <p className="auth-copy">충전 기록이 없어요.</p>}

        {records !== null && (
          <>
            <h2 style={{ fontSize: 14, margin: '18px 0 4px' }}>대기중인 요청 ({pending.length})</h2>
            {pending.length === 0 && <p className="auth-copy">대기중인 요청이 없어요.</p>}
            <div className="history-list">
              {pending.map((r) => (
                <div className="history-card" key={r.id}>
                  <div className="history-date">{new Date(r.createdAt).toLocaleString('ko-KR')}</div>
                  <div className="history-question">{r.email}</div>
                  <div className="history-question">
                    {r.referenceNote} · {r.coins}코인 · {r.amount.toLocaleString()}원
                  </div>
                  <div className="action-row">
                    <button
                      className="secondary-button"
                      disabled={busyId === r.id}
                      onClick={() => runAction(r.id, null, approveCharge)}
                    >
                      승인 (코인 지급)
                    </button>
                    <button
                      className="secondary-button"
                      disabled={busyId === r.id}
                      onClick={() => runAction(r.id, '결제 기록이 확인되지 않았나요? 요청을 거절합니다.', rejectCharge)}
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {processed.length > 0 && (
              <>
                <h2 style={{ fontSize: 14, margin: '22px 0 4px' }}>처리된 요청</h2>
                <div className="history-list">
                  {processed.map((r) => (
                    <div className="history-card" key={r.id}>
                      <div className="history-date">{new Date(r.createdAt).toLocaleString('ko-KR')}</div>
                      <div className="history-question">{r.email}</div>
                      <div className="history-question">
                        {r.referenceNote} · {r.coins}코인 · {r.amount.toLocaleString()}원
                      </div>
                      <p className="ai-error">
                        {r.revoked ? '회수됨' : statusLabel[r.status]}
                      </p>
                      {r.status === 'approved' && !r.revoked && (
                        <div className="action-row">
                          <button
                            className="secondary-button"
                            disabled={busyId === r.id}
                            onClick={() => runAction(r.id, '결제 기록이 없는 게 확인됐나요? 코인을 회수합니다.', revokeCharge)}
                          >
                            결제 기록 없음 - 회수
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
