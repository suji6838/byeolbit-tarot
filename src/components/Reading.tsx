import { useState } from 'react'
import { SPREADS, Spread, TarotCard, drawCards } from '../data'
import TarotCardView from './TarotCardView'
import { fetchAiInterpretation } from '../lib/interpret'
import { Reading as ReadingRecord, saveReading } from '../lib/readings'

type DrawnCard = { card: TarotCard; reversed: boolean }

function buildBaseInterpretation(spread: Spread, drawn: DrawnCard[]): string {
  return drawn
    .map((d, i) => {
      const position = spread.positions[i]
      const meaning = d.reversed ? d.card.meaningReversed : d.card.meaningUpright
      return `[${position.label}] ${d.card.nameKo}(${d.reversed ? '역방향' : '정방향'}) — ${meaning}`
    })
    .join('\n')
}

export default function Reading({ loggedIn, onRequireAuth }: { loggedIn: boolean; onRequireAuth: () => void }) {
  const [spread, setSpread] = useState<Spread | null>(null)
  const [question, setQuestion] = useState('')
  const [preparedDraw, setPreparedDraw] = useState<DrawnCard[] | null>(null)
  const [revealCount, setRevealCount] = useState(0)
  const [aiText, setAiText] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [saved, setSaved] = useState(false)

  const chooseSpread = (s: Spread) => {
    setSpread(s)
    setQuestion('')
    setPreparedDraw(null)
    setRevealCount(0)
    setAiText(null)
    setAiError('')
    setSaved(false)
  }

  const reset = () => {
    setSpread(null)
    setQuestion('')
    setPreparedDraw(null)
    setRevealCount(0)
    setAiText(null)
    setAiError('')
    setSaved(false)
  }

  const saveBaseReading = async (activeSpread: Spread, queue: DrawnCard[]) => {
    const record: ReadingRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      spreadId: activeSpread.id,
      spreadName: activeSpread.nameKo,
      question,
      cards: queue.map((d, i) => ({
        position: activeSpread.positions[i].label,
        cardId: d.card.id,
        cardName: d.card.nameKo,
        reversed: d.reversed,
      })),
      baseInterpretation: buildBaseInterpretation(activeSpread, queue),
      aiInterpretation: null,
    }
    try {
      await saveReading(record)
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }

  const revealNext = async () => {
    if (!spread) return
    if (revealCount === 0 && !question.trim()) return
    const queue = preparedDraw ?? drawCards(spread.positions.length)
    if (!preparedDraw) setPreparedDraw(queue)
    if (revealCount >= queue.length) return
    const nextCount = revealCount + 1
    setRevealCount(nextCount)
    if (nextCount === queue.length) {
      void saveBaseReading(spread, queue)
    }
  }

  const askAi = async () => {
    if (!spread || !preparedDraw) return
    setAiLoading(true)
    setAiError('')
    try {
      const text = await fetchAiInterpretation({
        spreadName: spread.nameKo,
        question,
        cards: preparedDraw.map((d, i) => ({
          position: spread.positions[i].label,
          cardId: d.card.id,
          cardName: d.card.nameKo,
          reversed: d.reversed,
        })),
      })
      setAiText(text)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : '해석을 불러오지 못했어요.')
    } finally {
      setAiLoading(false)
    }
  }

  if (!spread) {
    return (
      <div className="view">
        <span className="eyebrow">별빛마음상담소</span>
        <h1>오늘은 어떤 이야기를<br /><em>들어볼까요?</em></h1>
        <p className="subcopy">마음에 담아온 질문에 맞는 스프레드를 골라주세요.</p>
        <div className="spread-grid">
          {SPREADS.map((s) => (
            <button key={s.id} className="spread-card" onClick={() => chooseSpread(s)}>
              <h2>{s.nameKo}</h2>
              <p>{s.description}</p>
              <div className="position-tags">
                {s.positions.map((p) => (
                  <span key={p.label}>{p.label}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const total = spread.positions.length
  const drawn = preparedDraw ? preparedDraw.slice(0, revealCount) : []
  const allRevealed = revealCount === total && total > 0

  return (
    <div className="view">
      <button className="text-button" onClick={reset}>← 스프레드 다시 고르기</button>
      <h1>{spread.nameKo}{allRevealed ? ' 결과' : ''}</h1>
      {allRevealed && question ? (
        <p className="subcopy">"{question}"</p>
      ) : (
        <p className="subcopy">{spread.description}</p>
      )}

      {revealCount === 0 && (
        <div className="question-box">
          <label htmlFor="question">궁금한 것을 적어주세요</label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="예: 요즘 진로 고민이 많아요. 어떤 방향이 좋을까요?"
            maxLength={500}
          />
          <p className="hint">질문을 입력해야 카드를 뽑을 수 있어요.</p>
        </div>
      )}

      {drawn.length > 0 && (
        <div className="card-row">
          {drawn.map((d, i) => (
            <TarotCardView key={d.card.id} card={d.card} reversed={d.reversed} positionLabel={spread.positions[i].label} />
          ))}
        </div>
      )}

      {!allRevealed && (
        <div className="deck-stage">
          <div
            className={`deck-pile${revealCount === 0 && !question.trim() ? ' disabled' : ''}`}
            onClick={revealNext}
            role="button"
            aria-disabled={revealCount === 0 && !question.trim()}
            aria-label="카드 뽑기"
          >
            <div className="deck-back">✦</div>
            <div className="deck-back">✦</div>
            <div className="deck-back">✦</div>
          </div>
          <p className="deck-hint">
            {revealCount === 0
              ? question.trim()
                ? `카드 더미를 눌러 첫 번째 카드를 뽑아보세요. (${total}장 중 1번째: ${spread.positions[0].label})`
                : '질문을 먼저 입력해 주세요.'
              : `카드 더미를 눌러 다음 카드를 뽑아보세요. (${revealCount}/${total}장, 다음: ${spread.positions[revealCount].label})`}
          </p>
        </div>
      )}

      {allRevealed && (
        <>
          <div className="ai-box ai-box-primary">
            <span className="eyebrow">{question ? '질문에 대한 답변' : '오늘의 메시지'}</span>
            {aiText && <p>{aiText}</p>}
            {!aiText && !aiLoading && !aiError && (
              <button className="secondary-button" onClick={askAi}>AI 상담사에게 더 물어보기</button>
            )}
            {aiLoading && <p className="loading">별빛 상담사가 카드를 살펴보며 질문에 대한 답을 찾고 있어요...</p>}
            {aiError && (
              <>
                <p className="ai-error">{aiError}</p>
                <button className="secondary-button" onClick={askAi}>다시 시도</button>
              </>
            )}
          </div>
          <div className="result-section">
            <h2>카드별 기본 의미</h2>
            {drawn.map((d, i) => (
              <div className="card-meaning" key={d.card.id}>
                <h3>
                  <span className="position-label">{spread.positions[i].label}</span> {d.card.nameKo} ({d.reversed ? '역방향' : '정방향'})
                </h3>
                <p>{d.reversed ? d.card.meaningReversed : d.card.meaningUpright}</p>
              </div>
            ))}
          </div>
          {!loggedIn && (
            <p className="disclaimer">
              지금은 이 기기에만 상담 기록이 저장돼요.{' '}
              <button className="text-button" onClick={onRequireAuth} style={{ display: 'inline' }}>
                로그인
              </button>
              하면 다른 기기에서도 이어서 볼 수 있어요.
            </p>
          )}
          {loggedIn && saved && <p className="disclaimer">상담 기록이 저장됐어요. 히스토리 탭에서 다시 볼 수 있어요.</p>}
          <div className="action-row">
            <button className="secondary-button" onClick={reset}>다시 뽑기</button>
          </div>
        </>
      )}
    </div>
  )
}
