import { FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 해요.')
    if (password !== confirm) return setError('비밀번호가 서로 달라요.')
    setSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호를 변경하지 못했어요. 링크가 만료되었을 수 있어요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
        <span className="eyebrow">별빛마음상담소</span>
        <h1 id="reset-title">새 비밀번호를<br /><em>설정해 주세요.</em></h1>
        <form onSubmit={submit} noValidate>
          <label>새 비밀번호<input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" type="password" autoComplete="new-password" /></label>
          <label>새 비밀번호 확인<input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="6자 이상" type="password" autoComplete="new-password" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="google-button" type="submit" disabled={submitting}>
            {submitting ? '변경하는 중이에요' : '비밀번호 변경하기'}
          </button>
        </form>
      </section>
    </div>
  )
}
