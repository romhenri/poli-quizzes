import type { QuizList } from '@/types/list'
import type { QuizMetadata } from '@/types/quiz'

export const API_URL = process.env.API_URL ?? 'http://localhost:8000'

/** Reads go server-side, so the browser never learns the API's address. */
async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`)
  return (await res.json()) as T
}

export const getList = (code: string) => getJson<QuizList>(`/lists/${code}`)

export const getQuiz = (code: string, slug: string) =>
  getJson<QuizMetadata>(`/lists/${code}/quizzes/${slug}`)
