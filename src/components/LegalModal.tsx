import { LEGAL_EFFECTIVE_DATE, LegalSection, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../legal'
import { useEscapeKey } from '../lib/useEscapeKey'

type Props = { doc: 'terms' | 'privacy'; onClose: () => void }

const titles: Record<Props['doc'], string> = { terms: '이용약관', privacy: '개인정보처리방침' }
const sections: Record<Props['doc'], LegalSection[]> = { terms: TERMS_SECTIONS, privacy: PRIVACY_SECTIONS }

export default function LegalModal({ doc, onClose }: Props) {
  useEscapeKey(onClose)
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="auth-modal legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <span className="eyebrow">{LEGAL_EFFECTIVE_DATE} 시행</span>
        <h1 id="legal-title">{titles[doc]}</h1>
        <div className="legal-content">
          {sections[doc].map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
