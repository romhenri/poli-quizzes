'use client'

/**
 * Best score per quiz, in this browser only. There is no account to hang a
 * score on, so this is the whole of "progress".
 *
 * Deliberately not invalidated when a quiz is re-uploaded: a replaced quiz can
 * leave a stale badge behind. Decided, not overlooked.
 */
export interface Score {
  correct: number
  total: number
}

const key = (code: string, slug: string) => `pq:${code}:${slug}`

export function readScore(code: string, slug: string): Score | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(key(code, slug))
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (typeof parsed?.correct === 'number' && typeof parsed?.total === 'number') {
      return parsed
    }
  } catch {
    // Corrupt or blocked storage is the same as no score.
  }
  return undefined
}

export function writeScore(code: string, slug: string, score: Score): void {
  try {
    window.localStorage.setItem(key(code, slug), JSON.stringify(score))
  } catch {
    // Private mode or a full quota: losing a badge is not worth an error.
  }
}
