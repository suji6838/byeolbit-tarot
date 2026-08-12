import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awzbultaujvmkrrhaxuj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_da6EdXLCv-r41kf_oRtNlw_3NMxWrU8'
const ADMIN_EMAILS = ['joan6838@gmail.com']

async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    res.status(401).json({ error: '로그인이 필요해요.' })
    return null
  }
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: userData, error } = await anon.auth.getUser(token)
  if (error || !userData.user || !ADMIN_EMAILS.includes(userData.user.email ?? '')) {
    res.status(403).json({ error: '접근 권한이 없어요.' })
    return null
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    res.status(500).json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않아요.' })
    return null
  }
  return createClient(SUPABASE_URL, serviceRoleKey)
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req, res)
  if (!admin) return

  if (req.method === 'GET') {
    const { data: requests, error } = await admin
      .from('charge_requests')
      .select('id, user_id, reference_note, coins, amount, status, revoked, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return res.status(500).json({ error: '목록을 불러오지 못했어요.' })

    const emailByUserId = {}
    for (const userId of [...new Set((requests ?? []).map((r) => r.user_id))]) {
      const { data } = await admin.auth.admin.getUserById(userId)
      emailByUserId[userId] = data?.user?.email ?? '알 수 없음'
    }

    return res.status(200).json({
      requests: (requests ?? []).map((r) => ({
        id: r.id,
        userId: r.user_id,
        email: emailByUserId[r.user_id],
        referenceNote: r.reference_note,
        coins: r.coins,
        amount: r.amount,
        status: r.status,
        revoked: r.revoked,
        createdAt: r.created_at,
      })),
    })
  }

  if (req.method === 'POST') {
    const { requestId, action } = req.body ?? {}
    if (!requestId || !['approve', 'reject', 'revoke'].includes(action)) {
      return res.status(400).json({ error: '요청이 올바르지 않아요.' })
    }

    const { data: chargeRequest, error: fetchError } = await admin
      .from('charge_requests')
      .select('id, user_id, coins, status, revoked')
      .eq('id', requestId)
      .maybeSingle()
    if (fetchError || !chargeRequest) return res.status(404).json({ error: '요청을 찾을 수 없어요.' })

    if (action === 'approve') {
      if (chargeRequest.status !== 'pending') return res.status(400).json({ error: '대기중인 요청만 승인할 수 있어요.' })
      const { error: creditError } = await admin.rpc('credit_coins', {
        p_user_id: chargeRequest.user_id,
        p_coins: chargeRequest.coins,
      })
      if (creditError) {
        console.error('credit_coins failed:', creditError)
        return res.status(500).json({ error: '코인 적립 중 오류가 발생했어요.' })
      }
      await admin
        .from('charge_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', requestId)
      return res.status(200).json({ ok: true })
    }

    if (action === 'reject') {
      if (chargeRequest.status !== 'pending') return res.status(400).json({ error: '대기중인 요청만 거절할 수 있어요.' })
      await admin
        .from('charge_requests')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', requestId)
      return res.status(200).json({ ok: true })
    }

    // revoke: 승인 후에 결제 기록이 없는 것으로 확인된 건을 사후 회수
    if (chargeRequest.status !== 'approved') return res.status(400).json({ error: '승인된 요청만 회수할 수 있어요.' })
    if (chargeRequest.revoked) return res.status(400).json({ error: '이미 회수된 요청이에요.' })

    const { error: revokeError } = await admin.rpc('revoke_coins', {
      p_user_id: chargeRequest.user_id,
      p_coins: chargeRequest.coins,
    })
    if (revokeError) {
      console.error('revoke_coins failed:', revokeError)
      return res.status(500).json({ error: '코인 회수 중 오류가 발생했어요.' })
    }
    await admin
      .from('charge_requests')
      .update({ revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', requestId)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: '허용되지 않는 요청이에요.' })
}
