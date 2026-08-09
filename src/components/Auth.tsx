import { FormEvent, useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '../config'
import { supabase } from '../lib/supabase'
import LegalModal from './LegalModal'

const CONSENT_KEY = 'byeolbit:agreed'

type Member = { name: string; email: string; picture?: string }
type Props = {
  onClose: () => void
  onComplete: (member: Member) => Promise<void>
  member: Member | null
  onLogout: () => Promise<void>
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

function friendlyAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않아요.'
  if (message.includes('User already registered')) return '이미 가입된 이메일이에요. 아래에서 로그인해 주세요.'
  if (message.includes('Email not confirmed')) return '이메일 인증이 아직 완료되지 않았어요. 메일함의 확인 링크를 눌러주세요.'
  if (message.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 해요.'
  if (message.includes('rate limit')) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  return '처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
}

export default function Auth({ onClose, onComplete, member, onLogout }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedBefore, setAgreedBefore] = useState(() => localStorage.getItem(CONSENT_KEY) === '1')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | null>(null)
  const readyForAuth = agreedBefore || (agreeTerms && agreePrivacy)
  const markAgreed = () => {
    localStorage.setItem(CONSENT_KEY, '1')
    setAgreedBefore(true)
  }

  useEffect(() => {
    let cancelled = false
    const handleCredential = async (response: { credential: string }) => {
      if (!readyForAuth) {
        setError('이용약관과 개인정보 수집·이용에 동의한 후 진행해 주세요.')
        return
      }
      setSubmitting(true)
      setError('')
      try {
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
        })
        if (signInError || !data.user) throw signInError ?? new Error('no user')
        markAgreed()
        const meta = data.user.user_metadata ?? {}
        await onComplete({
          name: meta.full_name || meta.name || data.user.email || '회원',
          email: data.user.email ?? '',
          picture: meta.avatar_url || meta.picture,
        })
        onClose()
      } catch (err) {
        console.error('Google/Supabase sign-in failed:', err)
        setError('로그인 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
      } finally {
        setSubmitting(false)
      }
    }
    const init = () => {
      if (cancelled || !window.google) return
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential })
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 320,
        })
      }
    }
    if (window.google?.accounts?.id) {
      init()
    } else {
      const script = document.getElementById('google-identity-script')
      script?.addEventListener('load', init)
      return () => script?.removeEventListener('load', init)
    }
    return () => { cancelled = true }
  }, [member, readyForAuth])

  if (member) {
    const logout = async () => {
      setSubmitting(true)
      try {
        window.google?.accounts?.id?.disableAutoSelect()
        await onLogout()
        onClose()
      } finally {
        setSubmitting(false)
      }
    }
    return (
      <div className="modal-backdrop" role="presentation" onClick={onClose}>
        <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose} aria-label="창 닫기">×</button>
          <span className="eyebrow">별빛마음상담소 회원</span>
          {member.picture && <img src={member.picture} alt="" className="member-avatar-lg" referrerPolicy="no-referrer" />}
          <h1 id="auth-title">{member.name}님,<br /><em>안녕하세요.</em></h1>
          <p className="auth-copy">{member.email}으로 로그인되어 있어요. 상담 기록이 계정에 안전하게 저장돼요.</p>
          <button className="google-button" type="button" onClick={logout} disabled={submitting}>{submitting ? '로그아웃하는 중이에요' : '로그아웃'}</button>
          <p className="legal-footer-links">
            <button type="button" onClick={() => setLegalView('terms')}>이용약관</button><span>·</span>
            <button type="button" onClick={() => setLegalView('privacy')}>개인정보처리방침</button>
          </p>
        </section>
        {legalView && <LegalModal doc={legalView} onClose={() => setLegalView(null)} />}
      </div>
    )
  }

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const cleanEmail = email.trim()
    const cleanName = name.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError('올바른 이메일 주소를 입력해 주세요.')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 해요.')
    if (mode === 'signup' && !cleanName) return setError('이름을 입력해 주세요.')
    if (!readyForAuth) return setError('이용약관과 개인정보 수집·이용에 동의한 후 진행해 주세요.')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: cleanName } },
        })
        if (signUpError) throw signUpError
        markAgreed()
        if (!data.session) {
          setNotice('확인 이메일을 보냈어요. 메일함의 링크를 눌러 인증을 완료한 뒤 로그인해 주세요.')
          setMode('signin')
          setPassword('')
        } else {
          await onComplete({ name: cleanName, email: cleanEmail })
          onClose()
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
        if (signInError) throw signInError
        markAgreed()
        const meta = data.user.user_metadata ?? {}
        await onComplete({
          name: meta.full_name || meta.name || data.user.email || cleanEmail,
          email: data.user.email ?? cleanEmail,
          picture: meta.avatar_url || meta.picture,
        })
        onClose()
      }
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="회원가입 창 닫기">×</button>
        <span className="eyebrow">별빛마음상담소 시작하기</span>
        <h1 id="auth-title">내 상담 기록을<br /><em>안전하게 이어가세요.</em></h1>
        <p className="auth-copy">로그인하면 지난 상담 기록을 다른 기기에서도 이어서 확인할 수 있어요.</p>
        {!agreedBefore && (
          <div className="consent-box">
            <p className="consent-title">시작하기 전에 약관에 동의해 주세요.</p>
            <label className="consent-row">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
              <span>[필수] <button type="button" className="legal-link" onClick={() => setLegalView('terms')}>이용약관</button>에 동의합니다.</span>
            </label>
            <label className="consent-row">
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
              <span>[필수] <button type="button" className="legal-link" onClick={() => setLegalView('privacy')}>개인정보 수집·이용</button>에 동의합니다. (질문/카드 결과 등 상담 관련 정보 포함)</span>
            </label>
          </div>
        )}
        {readyForAuth ? <div ref={buttonRef} className="google-signin-slot" /> : <p className="consent-note">약관에 모두 동의하면 구글로 계속하기를 이용할 수 있어요.</p>}
        <div className="auth-divider"><span>또는 이메일로 {mode === 'signup' ? '가입' : '로그인'}</span></div>
        <form onSubmit={submitEmail} noValidate>
          {mode === 'signup' && (
            <label>이름<input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력해 주세요" autoComplete="name" /></label>
          )}
          <label>이메일<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" type="email" autoComplete="email" /></label>
          <label>비밀번호<input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
          {notice && <p className="auth-copy" role="status">{notice}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="google-button" type="submit" disabled={submitting || !readyForAuth}>
            {submitting ? '처리하고 있어요' : mode === 'signup' ? '이메일로 회원가입' : '이메일로 로그인'}
          </button>
        </form>
        <button type="button" className="text-button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice('') }}>
          {mode === 'signup' ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 이메일로 가입하기'}
        </button>
        <p className="auth-note">로그인하면 상담 기록이 안전하게 저장되어, 다른 기기에서도 이어서 확인할 수 있어요.</p>
        <p className="legal-footer-links">
          <button type="button" onClick={() => setLegalView('terms')}>이용약관</button><span>·</span>
          <button type="button" onClick={() => setLegalView('privacy')}>개인정보처리방침</button>
        </p>
      </section>
      {legalView && <LegalModal doc={legalView} onClose={() => setLegalView(null)} />}
    </div>
  )
}
