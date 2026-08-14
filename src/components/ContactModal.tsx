import { useEscapeKey } from '../lib/useEscapeKey'
import { CONTACT_EMAIL } from '../config'

type Props = { onClose: () => void }

export default function ContactModal({ onClose }: Props) {
  useEscapeKey(onClose)
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <span className="eyebrow">문의하기</span>
        <h1 id="contact-title">궁금한 점이 있으신가요?</h1>
        <p className="auth-copy">아래 이메일로 문의해 주시면 확인 후 답변드릴게요.</p>
        <p className="contact-email">{CONTACT_EMAIL}</p>
      </section>
    </div>
  )
}
