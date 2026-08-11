import { TOSS_CLIENT_KEY, COIN_PACKAGE } from '../config'
import { supabase } from './supabase'

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestPayment: (options: Record<string, unknown>) => Promise<void>
      }
    }
  }
}

function loadTossScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) return resolve()
    const existing = document.getElementById('toss-payments-script') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Toss SDK 로드 실패')))
      return
    }
    const script = document.createElement('script')
    script.id = 'toss-payments-script'
    script.src = 'https://js.tosspayments.com/v2/standard'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Toss SDK 로드 실패'))
    document.head.appendChild(script)
  })
}

export async function confirmPayment(params: { paymentKey: string; orderId: string; amount: number }): Promise<number> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('로그인이 필요해요.')

  const res = await fetch('/api/payment-confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || '결제 확인에 실패했어요.')
  return body.coins as number
}

export async function requestCoinCharge(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) throw new Error('로그인이 필요해요.')

  const orderId = crypto.randomUUID()
  const { error: insertError } = await supabase.from('payments').insert({
    user_id: user.id,
    order_id: orderId,
    amount: COIN_PACKAGE.amount,
    coins: COIN_PACKAGE.coins,
    status: 'pending',
  })
  if (insertError) throw new Error('주문 생성에 실패했어요. 잠시 후 다시 시도해 주세요.')

  await loadTossScript()
  if (!window.TossPayments) throw new Error('결제 모듈을 불러오지 못했어요.')

  const payment = window.TossPayments(TOSS_CLIENT_KEY).payment({ customerKey: user.id })
  const origin = window.location.origin + window.location.pathname
  await payment.requestPayment({
    method: 'CARD',
    amount: { value: COIN_PACKAGE.amount, currency: 'KRW' },
    orderId,
    orderName: `별빛마음상담소 코인 ${COIN_PACKAGE.coins}개`,
    customerEmail: user.email,
    successUrl: `${origin}?payment=success`,
    failUrl: `${origin}?payment=fail`,
  })
}
