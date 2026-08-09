import { DrawnCardRecord } from './readings'

export async function fetchAiInterpretation(params: {
  spreadName: string
  question: string
  cards: DrawnCardRecord[]
}): Promise<string> {
  const res = await fetch('/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || '해석을 불러오지 못했어요.')
  }
  const data = await res.json()
  return data.interpretation as string
}
