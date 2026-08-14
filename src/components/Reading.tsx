import { KeyboardEvent, useState } from 'react'
import { SPREADS, Spread, TarotCard, drawCards } from '../data'
import TarotCardView from './TarotCardView'
import { InsufficientCoinsError, fetchAiInterpretation } from '../lib/interpret'
import { Reading as ReadingRecord, saveReading, updateReadingAiInterpretation } from '../lib/readings'
import { hasUsedFreeAiToday } from '../lib/wallet'

type DrawnCard = { card: TarotCard; reversed: boolean }

function activateOnKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler()
    }
  }
}

function buildBaseInterpretation(spread: Spread, drawn: DrawnCard[]): string {
  return drawn
    .map((d, i) => {
      const position = spread.positions[i]
      const meaning = d.reversed ? d.card.meaningReversed : d.card.meaningUpright
      return `[${position.label}] ${d.card.nameKo}(${d.reversed ? '역방향' : '정방향'}) — ${meaning}`
    })
    .join('\n')
}

type Props = {
  loggedIn: boolean
  coins: number | null
  onRequireAuth: () => void
  onRequireCharge: () => void
  onCoinsChange: (coins: number) => void
}

export default function Reading({ loggedIn, coins, onRequireAuth, onRequireCharge, onCoinsChange }: Props) {
  const [spread, setSpread] = useState<Spread | null>(null)
  const [question, setQuestion] = useState('')
  const [preparedDraw, setPreparedDraw] = useState<DrawnCard[] | null>(null)
  const [revealCount, setRevealCount] = useState(0)
  const [fanPool, setFanPool] = useState<DrawnCard[] | null>(null)
  const [pickedIndices, setPickedIndices] = useState<number[]>([])
  const [freeUsedToday, setFreeUsedToday] = useState(false)
  const [aiText, setAiText] = useState<string | null>(null)
  const [aiMethod, setAiMethod] = useState<'free' | 'paid' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [insufficientCoins, setInsufficientCoins] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentReadingId, setCurrentReadingId] = useState<string | null>(null)

  const clearDraw = (targetSpread: Spread | null) => {
    setQuestion('')
    setPreparedDraw(null)
    setRevealCount(0)
    setPickedIndices([])
    setFanPool(targetSpread?.pickMode === 'fan' ? drawCards(targetSpread.fanSize ?? 9) : null)
    setAiText(null)
    setAiMethod(null)
    setAiError('')
    setInsufficientCoins(false)
    setSaved(false)
    setCurrentReadingId(null)
    if (loggedIn) {
      void hasUsedFreeAiToday().then(setFreeUsedToday)
    } else {
      setFreeUsedToday(false)
    }
  }

  const chooseSpread = (s: Spread) => {
    setSpread(s)
    clearDraw(s)
  }

  const redraw = () => {
    clearDraw(spread)
  }

  const reset = () => {
    setSpread(null)
    clearDraw(null)
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
    setCurrentReadingId(record.id)
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

  const pickFanCard = (idx: number, currentDrawnLength: number) => {
    if (!spread || !fanPool) return
    if (currentDrawnLength === 0 && !question.trim()) return
    if (pickedIndices.includes(idx)) return
    if (pickedIndices.length >= spread.positions.length) return
    const nextPicked = [...pickedIndices, idx]
    setPickedIndices(nextPicked)
    if (nextPicked.length === spread.positions.length) {
      const queue = nextPicked.map((i) => fanPool[i])
      void saveBaseReading(spread, queue)
    }
  }

  const askAi = async () => {
    if (!spread) return
    if (!loggedIn) {
      onRequireAuth()
      return
    }
    const cards = spread.pickMode === 'fan' ? (fanPool ? pickedIndices.map((i) => fanPool[i]) : []) : preparedDraw
    if (!cards || cards.length === 0) return
    setAiLoading(true)
    setAiError('')
    setInsufficientCoins(false)
    try {
      const result = await fetchAiInterpretation({
        spreadId: spread.id,
        spreadName: spread.nameKo,
        question,
        cards: cards.map((d, i) => ({
          position: spread.positions[i].label,
          cardId: d.card.id,
          cardName: d.card.nameKo,
          reversed: d.reversed,
        })),
      })
      setAiText(result.interpretation)
      setAiMethod(result.method)
      if (result.remainingCoins != null) onCoinsChange(result.remainingCoins)
      if (currentReadingId) {
        void updateReadingAiInterpretation(currentReadingId, result.interpretation).catch((err) => {
          console.error('AI 해석을 기록에 저장하지 못했어요:', err)
        })
      }
    } catch (err) {
      if (err instanceof InsufficientCoinsError) {
        setInsufficientCoins(true)
        setAiError(err.message)
      } else {
        setAiError(err instanceof Error ? err.message : '해석을 불러오지 못했어요.')
      }
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
        <div className="usage-info">
          <span className="usage-info-title">✨ 별빛 타로 이용 안내</span>
          <p>매일 한 번, 무료로 타로를 만나보세요.</p>
          <p className="usage-info-price">더 깊이 들여다보고 싶다면 1회 10코인(2,900원)으로 추가 리딩을 이용할 수 있어요.</p>
        </div>
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
  const isFan = spread.pickMode === 'fan'
  const drawn = isFan
    ? pickedIndices.map((idx) => fanPool![idx])
    : preparedDraw
      ? preparedDraw.slice(0, revealCount)
      : []
  const allRevealed = drawn.length === total && total > 0
  const questionRequired = drawn.length === 0 && !question.trim()

  return (
    <div className="view">
      <button className="text-button" onClick={reset}>← 스프레드 다시 고르기</button>
      <h1>{spread.nameKo}{allRevealed ? ' 결과' : ''}</h1>
      {allRevealed && question ? (
        <p className="subcopy">"{question}"</p>
      ) : (
        <p className="subcopy">{spread.description}</p>
      )}

      {drawn.length === 0 && (
        <div className="question-box">
          <label htmlFor="question">궁금한 것을 적어주세요</label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={spread.questionPlaceholder}
            maxLength={500}
          />
          <p className="hint">질문을 입력해야 카드를 뽑을 수 있어요.</p>
        </div>
      )}

      {!allRevealed && loggedIn && freeUsedToday && (coins ?? 0) < 10 && (
        <div className="coin-notice">
          <p>오늘의 무료 상담은 이미 사용했어요. 이번 카드 결과의 별빛 상담사 해석을 보려면 코인이 필요해요.</p>
          <button className="text-button" type="button" onClick={onRequireCharge}>코인 충전하기</button>
        </div>
      )}

      {drawn.length > 0 && (
        <div className="card-row">
          {drawn.map((d, i) => (
            <TarotCardView key={d.card.id} card={d.card} reversed={d.reversed} positionLabel={spread.positions[i].label} />
          ))}
        </div>
      )}

      {!allRevealed && !isFan && (
        <div className="deck-stage">
          <div
            className={`deck-pile${questionRequired ? ' disabled' : ''}`}
            onClick={revealNext}
            onKeyDown={activateOnKey(revealNext)}
            role="button"
            tabIndex={questionRequired ? -1 : 0}
            aria-disabled={questionRequired}
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

      {!allRevealed && isFan && (
        <div className="deck-stage">
          <div className="fan-grid">
            {fanPool?.map((_, idx) =>
              pickedIndices.includes(idx) ? null : (
                <div
                  key={idx}
                  className={`fan-card${questionRequired ? ' disabled' : ''}`}
                  onClick={() => pickFanCard(idx, drawn.length)}
                  onKeyDown={activateOnKey(() => pickFanCard(idx, drawn.length))}
                  role="button"
                  tabIndex={questionRequired ? -1 : 0}
                  aria-disabled={questionRequired}
                  aria-label="카드 선택"
                >
                  ✦
                </div>
              )
            )}
          </div>
          <p className="deck-hint">
            {questionRequired
              ? '질문을 먼저 입력해 주세요.'
              : `카드 중 하나를 골라 "${spread.positions[drawn.length].label}"로 확인해보세요.`}
          </p>
        </div>
      )}

      {allRevealed && (
        <>
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
            <div className="ai-box">
              <span className="eyebrow">별빛 상담사의 한마디</span>
              {aiText && (
                <>
                  <p>{aiText}</p>
                  <p className="hint">
                    {aiMethod === 'paid' ? '코인 10개를 사용했어요.' : '오늘의 무료 해석을 사용했어요.'}
                  </p>
                </>
              )}
              {!aiText && !aiLoading && !aiError && (
                <button className="secondary-button" onClick={askAi}>
                  {loggedIn ? '별빛 상담사에게 더 물어보기' : '로그인하고 별빛 상담 받기'}
                </button>
              )}
              {aiLoading && <p className="loading">별빛 상담사가 카드를 살펴보며 질문에 대한 답을 찾고 있어요...</p>}
              {aiError && (
                <>
                  <p className="ai-error">{aiError}</p>
                  {insufficientCoins ? (
                    <button className="secondary-button" onClick={onRequireCharge}>코인 충전하기</button>
                  ) : (
                    <button className="secondary-button" onClick={askAi}>다시 시도</button>
                  )}
                </>
              )}
            </div>
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
            <button className="secondary-button" onClick={redraw}>다시 뽑기</button>
          </div>
        </>
      )}
    </div>
  )
}
