import { supabase } from './supabase'

export interface DrawnCardRecord {
  position: string
  cardId: string
  cardName: string
  reversed: boolean
}

export interface Reading {
  id: string
  createdAt: string
  spreadId: string
  spreadName: string
  question: string
  cards: DrawnCardRecord[]
  baseInterpretation: string
  aiInterpretation: string | null
}

const STORAGE_KEY = 'byeolbit:readings'
const MIGRATION_FLAG = 'byeolbit:readings-migrated'

function readLocal(): Reading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Reading[]) : []
  } catch {
    return []
  }
}

function writeLocal(readings: Reading[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readings))
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

async function migrateLocalToRemote(userId: string) {
  if (localStorage.getItem(MIGRATION_FLAG)) return
  const local = readLocal()
  if (local.length > 0) {
    await supabase.from('readings').insert(
      local.map((r) => ({
        id: r.id,
        user_id: userId,
        created_at: r.createdAt,
        spread_id: r.spreadId,
        spread_name: r.spreadName,
        question: r.question,
        cards: r.cards,
        base_interpretation: r.baseInterpretation,
        ai_interpretation: r.aiInterpretation,
      }))
    )
  }
  localStorage.setItem(MIGRATION_FLAG, '1')
}

export async function saveReading(reading: Reading): Promise<void> {
  const userId = await getUserId()
  if (userId) {
    await migrateLocalToRemote(userId)
    await supabase.from('readings').insert({
      id: reading.id,
      user_id: userId,
      created_at: reading.createdAt,
      spread_id: reading.spreadId,
      spread_name: reading.spreadName,
      question: reading.question,
      cards: reading.cards,
      base_interpretation: reading.baseInterpretation,
      ai_interpretation: reading.aiInterpretation,
    })
  } else {
    const local = readLocal()
    local.unshift(reading)
    writeLocal(local.slice(0, 50))
  }
}

export async function updateReadingAiInterpretation(id: string, aiInterpretation: string): Promise<void> {
  const userId = await getUserId()
  if (userId) {
    const { error } = await supabase.from('readings').update({ ai_interpretation: aiInterpretation }).eq('id', id)
    if (error) throw error
  } else {
    const local = readLocal()
    const idx = local.findIndex((r) => r.id === id)
    if (idx !== -1) {
      local[idx] = { ...local[idx], aiInterpretation }
      writeLocal(local)
    }
  }
}

export async function listReadings(): Promise<Reading[]> {
  const userId = await getUserId()
  if (userId) {
    await migrateLocalToRemote(userId)
    const { data } = await supabase
      .from('readings')
      .select('id, created_at, spread_id, spread_name, question, cards, base_interpretation, ai_interpretation')
      .order('created_at', { ascending: false })
      .limit(50)
    return (data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      spreadId: row.spread_id,
      spreadName: row.spread_name,
      question: row.question,
      cards: row.cards,
      baseInterpretation: row.base_interpretation,
      aiInterpretation: row.ai_interpretation,
    }))
  }
  return readLocal()
}
