import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awzbultaujvmkrrhaxuj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_da6EdXLCv-r41kf_oRtNlw_3NMxWrU8'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용돼요.' })

  const secretKey = process.env.TOSS_SECRET_KEY
  if (!secretKey) return res.status(500).json({ error: '서버에 TOSS_SECRET_KEY가 설정되어 있지 않아요.' })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return res.status(500).json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않아요.' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: '로그인이 필요해요.' })

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: userData, error: userError } = await anon.auth.getUser(token)
  if (userError || !userData.user) return res.status(401).json({ error: '로그인이 필요해요.' })
  const userId = userData.user.id

  const { paymentKey, orderId, amount } = req.body ?? {}
  if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || typeof amount !== 'number') {
    return res.status(400).json({ error: '결제 정보가 올바르지 않아요.' })
  }

  const admin = createClient(SUPABASE_URL, serviceRoleKey)

  const { data: order, error: orderError } = await admin
    .from('payments')
    .select('id, user_id, amount, coins, status')
    .eq('order_id', orderId)
    .maybeSingle()
  if (orderError || !order) return res.status(404).json({ error: '주문 정보를 찾을 수 없어요.' })
  if (order.user_id !== userId) return res.status(403).json({ error: '본인 주문만 처리할 수 있어요.' })
  if (order.status === 'paid') return res.status(200).json({ ok: true, alreadyProcessed: true })
  if (order.status !== 'pending') return res.status(400).json({ error: '처리할 수 없는 주문 상태예요.' })
  if (order.amount !== amount) return res.status(400).json({ error: '결제 금액이 일치하지 않아요.' })

  try {
    const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    const confirmData = await confirmRes.json()

    if (!confirmRes.ok) {
      console.error('Toss confirm failed:', confirmRes.status, confirmData)
      await admin.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('order_id', orderId)
      return res.status(402).json({ error: confirmData?.message || '결제 승인에 실패했어요.' })
    }

    await admin
      .from('payments')
      .update({ status: 'paid', toss_payment_key: paymentKey, updated_at: new Date().toISOString() })
      .eq('order_id', orderId)

    const { data: newBalance, error: creditError } = await admin.rpc('credit_coins', {
      p_user_id: userId,
      p_coins: order.coins,
    })
    if (creditError) {
      console.error('credit_coins failed after successful payment:', creditError)
      return res.status(500).json({ error: '결제는 완료됐지만 코인 적립 중 오류가 발생했어요. 문의해 주세요.' })
    }

    return res.status(200).json({ ok: true, coins: newBalance })
  } catch (err) {
    console.error('payment-confirm handler error:', err)
    return res.status(500).json({ error: '결제 처리 중 오류가 발생했어요.' })
  }
}
