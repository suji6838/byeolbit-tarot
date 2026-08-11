import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awzbultaujvmkrrhaxuj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_da6EdXLCv-r41kf_oRtNlw_3NMxWrU8'
const ADMIN_EMAIL = 'joan6838@gmail.com'
const MAX_NOTE_LENGTH = 100

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용돼요.' })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return res.status(500).json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않아요.' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: '로그인이 필요해요.' })

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: userData, error: userError } = await anon.auth.getUser(token)
  if (userError || !userData.user) return res.status(401).json({ error: '로그인이 필요해요.' })
  const user = userData.user

  const { referenceNote, coins, amount } = req.body ?? {}
  const cleanNote = typeof referenceNote === 'string' ? referenceNote.trim().slice(0, MAX_NOTE_LENGTH) : ''
  if (!cleanNote) return res.status(400).json({ error: '입금자명 또는 주문번호를 입력해 주세요.' })
  if (typeof coins !== 'number' || typeof amount !== 'number' || coins <= 0 || amount <= 0) {
    return res.status(400).json({ error: '충전 정보가 올바르지 않아요.' })
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey)
  const { data: inserted, error: insertError } = await admin
    .from('charge_requests')
    .insert({ user_id: user.id, reference_note: cleanNote, coins, amount })
    .select('id, created_at')
    .single()
  if (insertError) {
    console.error('charge_requests insert failed:', insertError)
    return res.status(500).json({ error: '충전 요청 저장에 실패했어요.' })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: '별빛마음상담소 <onboarding@resend.dev>',
          to: [ADMIN_EMAIL],
          subject: `[충전 요청] ${cleanNote} · 코인 ${coins}개 · ${amount.toLocaleString()}원`,
          text: [
            '새 코인 충전 요청이 도착했어요.',
            '',
            `요청자 이메일: ${user.email}`,
            `입금자명/주문번호: ${cleanNote}`,
            `코인: ${coins}개 / 금액: ${amount.toLocaleString()}원`,
            `요청 시각: ${inserted.created_at}`,
            '',
            '앱에서 로그인 후 우측 상단 🛠 아이콘을 눌러 승인해 주세요.',
          ].join('\n'),
        }),
      })
    } catch (err) {
      console.error('Resend 알림 메일 발송 실패:', err)
    }
  }

  return res.status(200).json({ ok: true, id: inserted.id })
}
