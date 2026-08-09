import { TarotCard } from '../data'

type Props = {
  card: TarotCard
  reversed: boolean
  positionLabel: string
}

export default function TarotCardView({ card, reversed, positionLabel }: Props) {
  const keywords = reversed ? card.keywordsReversed : card.keywordsUpright
  return (
    <div className={`tarot-card${reversed ? ' reversed' : ''}`}>
      <span className="position-label">{positionLabel}</span>
      <span className="card-icon">{card.icon}</span>
      <span className="card-name">{card.nameKo}</span>
      <span className="card-orient">{reversed ? '역방향' : '정방향'}</span>
      <div className="card-keywords">
        {keywords.map((k) => (
          <span key={k}>{k}</span>
        ))}
      </div>
    </div>
  )
}
