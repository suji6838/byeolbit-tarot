const MAX_QUESTION_LENGTH = 500
const MAX_CARDS = 10

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용돼요.' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(503).json({ error: '준비중입니다.' })

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
    '너는 따뜻하고 통찰력 있는 타로 상담사야. 사용자가 직접 질문을 했다면, 그 질문에 실제로 답하는 사람처럼 첫 문장부터 바로 반응해줘 ' +
    '(예: "이직이 잘 될지 궁금하시군요" 같은 공감으로 시작해서, 지금 흐름이 어떤지, 무엇을 조심하면 좋을지 등 질문에 맞는 이야기로 풀어줘). ' +
    '카드 이름이나 방향을 그대로 나열하지 말고, 카드가 보여주는 의미를 질문에 대한 답의 근거로만 자연스럽게 녹여서 언급해줘. ' +
    '질문이 없다면 오늘 하루의 흐름에 대해 같은 방식으로 답해줘. ' +
    '단정적인 예언이나 의료·법률·재정 조언처럼 들리는 표현은 피하고, 성찰과 위로, 실천 가능한 제안 중심으로 200~350자 내외로 답해줘.'

  const userPrompt = `스프레드: ${cleanSpread}\n뽑힌 카드:\n${cardLines}\n${
    cleanQuestion
      ? `사용자의 질문: "${cleanQuestion}"\n이 질문에 직접 답하듯이 설명해줘.`
      : '사용자가 특별한 질문 없이 오늘의 흐름을 물었어요.'
  }`

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 500 },
        }),
      }
    )
    if (!response.ok) {
      const errBody = await response.text()
      console.error('Gemini API error:', response.status, errBody)
      return res.status(502).json({ error: 'AI 해석 생성에 실패했어요. 잠시 후 다시 시도해 주세요.' })
    }
    const data = await response.json()
    const interpretation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!interpretation) return res.status(502).json({ error: 'AI 응답이 비어 있어요.' })
    return res.status(200).json({ interpretation })
  } catch (err) {
    console.error('interpret handler error:', err)
    return res.status(500).json({ error: '해석 중 오류가 발생했어요.' })
  }
}
