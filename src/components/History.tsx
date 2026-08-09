import { useEffect, useState } from 'react'
import { Reading, listReadings } from '../lib/readings'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function History({ loggedIn, onRequireAuth }: { loggedIn: boolean; onRequireAuth: () => void }) {
  const [readings, setReadings] = useState<Reading[] | null>(null)

  useEffect(() => {
    listReadings()
      .then(setReadings)
      .catch(() => setReadings([]))
  }, [])

  if (readings === null) {
    return <div className="loading-view">불러오는 중이에요...</div>
  }

  if (readings.length === 0) {
    return (
      <div className="empty-view">
        <div className="empty-orb">🔮</div>
        <h1>아직 상담 기록이 없어요</h1>
        <p>첫 카드를 뽑으면 이곳에 기록이 쌓여요.</p>
        {!loggedIn && (
          <button className="secondary-button" onClick={onRequireAuth}>
            로그인하고 기록 이어서 보기
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="view">
      <span className="eyebrow">지난 상담</span>
      <h1>나의 상담 기록</h1>
      {!loggedIn && (
        <p className="subcopy">
          지금은 이 기기에만 저장돼요.{' '}
          <button className="text-button" onClick={onRequireAuth} style={{ display: 'inline' }}>
            로그인
          </button>
          하면 계정에 안전하게 이어서 보관돼요.
        </p>
      )}
      <div className="history-list">
        {readings.map((r) => (
          <div className="history-card" key={r.id}>
            <div className="history-date">{formatDate(r.createdAt)} · {r.spreadName}</div>
            {r.question && <div className="history-question">{r.question}</div>}
            <div className="history-cards">
              {r.cards.map((c) => (
                <span key={c.position}>
                  {c.position}: {c.cardName}({c.reversed ? '역' : '정'})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
