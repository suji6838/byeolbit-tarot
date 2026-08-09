const MAX_QUESTION_LENGTH = 500
const MAX_CARDS = 10

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용돼요.' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(500).json({ error: '서버에 OPENAI_API_KEY가 설정되어 있지 않아요.' })

  const { spreadName, question, cards } = req.body ?? {}
  if (!Array.isArray(cards) || cards.length === 0 || cards.length > MAX_CARDS) {
    return res.status(400).json({ error: '카드 정보가 올바르지 않아요.' })
  }
  const cleanQuestion = typeof question === 'string' ? question.slice(0, MAX_QUESTION_LENGTH) : ''
  const cleanSpread = typeof spreadName === 'string' ? spreadName.slice(0, 60) : '타로 스프레드'

  const cardLines = cards
    .slice(0, MAX_CARDS)
    .map((c, i) => {
      const position = String(c?.position ?? `카드 ${i + 1}`).slice(0, 40)
      const name = String(c?.cardName ?? '알 수 없는 카드').slice(0, 40)
      const orientation = c?.reversed ? '역방향' : '정방향'
      return `${i + 1}. [${position}] ${name} (${orientation})`
    })
    .join('\n')

  const systemPrompt =
    '너는 따뜻하고 통찰력 있는 타로 상담사야. 사용자가 뽑은 카드와 질문을 바탕으로 자연스러운 한국어로 상담해줘. ' +
    '단정적인 예언이나 의료·법률·재정 조언처럼 들리는 표현은 피하고, 성찰과 위로, 실천 가능한 제안 중심으로 200~350자 내외로 답해줘. ' +
    '카드 이름을 나열하듯 설명하지 말고, 하나의 이야기처럼 자연스럽게 풀어줘.'

  const userPrompt = `스프레드: ${cleanSpread}\n뽑힌 카드:\n${cardLines}\n${
    cleanQuestion ? `사용자의 질문: ${cleanQuestion}` : '사용자가 특별한 질문 없이 오늘의 흐름을 물었어요.'
  }`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    })
    if (!response.ok) {
      const errBody = await response.text()
      console.error('OpenAI API error:', response.status, errBody)
      return res.status(502).json({ error: 'AI 해석 생성에 실패했어요. 잠시 후 다시 시도해 주세요.' })
    }
    const data = await response.json()
    const interpretation = data.choices?.[0]?.message?.content?.trim()
    if (!interpretation) return res.status(502).json({ error: 'AI 응답이 비어 있어요.' })
    return res.status(200).json({ interpretation })
  } catch (err) {
    console.error('interpret handler error:', err)
    return res.status(500).json({ error: '해석 중 오류가 발생했어요.' })
  }
}
