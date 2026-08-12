import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://awzbultaujvmkrrhaxuj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_da6EdXLCv-r41kf_oRtNlw_3NMxWrU8'

const MAX_QUESTION_LENGTH = 500
const MAX_CARDS = 10
const FRIENDLY_INSUFFICIENT_COINS = '오늘의 무료 해석을 이미 사용하셨어요. 코인을 충전하면 계속 이용할 수 있어요.'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용돼요.' })

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) return res.status(503).json({ error: '준비중입니다.' })

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return res.status(500).json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않아요.' })

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: '로그인이 필요해요.' })

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: userData, error: userError } = await anon.auth.getUser(token)
  if (userError || !userData.user) return res.status(401).json({ error: '로그인이 필요해요.' })
  const userId = userData.user.id

  const { spreadName, question, cards, spreadId: rawSpreadId } = req.body ?? {}
  if (!Array.isArray(cards) || cards.length === 0 || cards.length > MAX_CARDS) {
    return res.status(400).json({ error: '카드 정보가 올바르지 않아요.' })
  }
  const cleanQuestion = typeof question === 'string' ? question.slice(0, MAX_QUESTION_LENGTH) : ''
  const cleanSpread = typeof spreadName === 'string' ? spreadName.slice(0, 60) : '타로 스프레드'
  const spreadId = typeof rawSpreadId === 'string' ? rawSpreadId.slice(0, 40) : 'unknown'

  const admin = createClient(SUPABASE_URL, serviceRoleKey)

  // 먼저 무료/코인 잔여 여부만 확인(차감은 아직 안 함) — AI 생성이 실패하면 아무것도 소모하지 않기 위해서다.
  const { data: precheck, error: precheckError } = await admin
    .from('ai_usage_log')
    .select('id')
    .eq('user_id', userId)
    .eq('is_paid', false)
    .gte('created_at', new Date().toISOString().slice(0, 10))
    .maybeSingle()
  if (precheckError) {
    console.error('precheck failed:', precheckError)
    return res.status(500).json({ error: '크레딧 확인 중 오류가 발생했어요.' })
  }
  const willBePaid = Boolean(precheck)
  if (willBePaid) {
    const { data: wallet } = await admin.from('wallets').select('coins').eq('user_id', userId).maybeSingle()
    if (!wallet || wallet.coins < 10) {
      return res.status(402).json({ error: FRIENDLY_INSUFFICIENT_COINS, reason: 'insufficient_coins' })
    }
  }

  const cardLines = cards
    .slice(0, MAX_CARDS)
    .map((c, i) => {
      const position = String(c?.position ?? `카드 ${i + 1}`).slice(0, 40)
      const name = String(c?.cardName ?? '알 수 없는 카드').slice(0, 40)
      const orientation = c?.reversed ? '역방향' : '정방향'
      return `${i + 1}. [${position}] ${name} (${orientation})`
    })
    .join('\n')

  const systemPrompt = willBePaid
    ? '너는 따뜻하고 통찰력 있는 타로 상담사야. 지금은 사용자가 코인을 써서 받는 상담이니, 실제로 마주 앉아 이야기를 들어주는 상담사처럼 ' +
      '더 정성껏, 더 구체적으로 답해줘. 사용자가 질문을 했다면 그 질문에 실제로 답하는 사람처럼 첫 문장부터 바로 반응하고 ' +
      '(예: "이직이 잘 될지 궁금하시군요" 같은 공감으로 시작), 질문 속 구체적인 상황(무엇을 고민 중인지, 어떤 선택지들이 있을지)까지 짚어가며 ' +
      '뽑힌 카드 하나하나가 그 질문에 대해 각각 무엇을 말해주는지 순서대로 풀어서 설명해줘. ' +
      '카드 이름이나 방향을 그대로 나열하지 말고, 카드가 보여주는 의미를 질문에 대한 답의 근거로 자연스럽게 녹여서 언급하되, ' +
      '지금 상황에서 구체적으로 무엇을 하면 좋을지, 무엇을 조심해야 할지까지 실천 가능한 조언을 덧붙여줘. ' +
      '질문이 없다면 오늘 하루의 흐름에 대해 같은 방식으로 더 자세히 답해줘. ' +
      '단정적인 예언이나 의료·법률·재정 조언처럼 들리는 표현은 피하고, 성찰과 위로, 실천 가능한 제안 중심으로, ' +
      '실제 상담사가 말로 이야기해주듯 자연스러운 구어체로 450~650자 내외로 답해줘.'
    : '너는 따뜻하고 통찰력 있는 타로 상담사야. 사용자가 직접 질문을 했다면, 그 질문에 실제로 답하는 사람처럼 첫 문장부터 바로 반응해줘 ' +
      '(예: "이직이 잘 될지 궁금하시군요" 같은 공감으로 시작해서, 지금 흐름이 어떤지, 무엇을 조심하면 좋을지 등 질문에 맞는 이야기로 풀어줘). ' +
      '카드 이름이나 방향을 그대로 나열하지 말고, 카드가 보여주는 의미를 질문에 대한 답의 근거로만 자연스럽게 녹여서 언급해줘. ' +
      '질문이 없다면 오늘 하루의 흐름에 대해 같은 방식으로 답해줘. ' +
      '단정적인 예언이나 의료·법률·재정 조언처럼 들리는 표현은 피하고, 성찰과 위로, 실천 가능한 제안 중심으로 200~350자 내외로 답해줘.'

  const userPrompt = `스프레드: ${cleanSpread}\n뽑힌 카드:\n${cardLines}\n${
    cleanQuestion
      ? `사용자의 질문: "${cleanQuestion}"\n이 질문에 직접 답하듯이${willBePaid ? ' 구체적으로' : ''} 설명해줘.`
      : '사용자가 특별한 질문 없이 오늘의 흐름을 물었어요.'
  }`

  let interpretation
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: willBePaid ? 900 : 500 },
        }),
      }
    )
    if (!response.ok) {
      const errBody = await response.text()
      console.error('Gemini API error:', response.status, errBody)
      return res.status(502).json({ error: 'AI 해석 생성에 실패했어요. 잠시 후 다시 시도해 주세요.' })
    }
    const data = await response.json()
    interpretation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!interpretation) return res.status(502).json({ error: 'AI 응답이 비어 있어요.' })
  } catch (err) {
    console.error('interpret handler error:', err)
    return res.status(500).json({ error: '해석 중 오류가 발생했어요.' })
  }

  // 생성이 성공한 뒤에야 무료/코인을 원자적으로 차감한다(동시 요청 대비, 실패 시 아무것도 안 깎임).
  const { data: creditResult, error: creditError } = await admin.rpc('consume_ai_credit', {
    p_user_id: userId,
    p_spread_id: spreadId,
  })
  if (creditError || !creditResult?.ok) {
    console.error('consume_ai_credit failed after generation:', creditError, creditResult)
    return res.status(402).json({ error: FRIENDLY_INSUFFICIENT_COINS, reason: creditResult?.reason })
  }

  return res.status(200).json({
    interpretation,
    method: creditResult.method,
    remainingCoins: creditResult.remainingCoins ?? null,
  })
}
