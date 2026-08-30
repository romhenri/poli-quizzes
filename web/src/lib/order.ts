import { seqSortValue } from '@/utils/quizSeq'
import type { QuizCard } from '@/types/list'

/**
 * polimind's listing order, copied so a shared list reads the same way the
 * source quizzes do: category (A-Z), first tag (A-Z), seq (0,1,...; missing
 * sorts last), then name (A-Z).
 */
export function compareCards(a: QuizCard, b: QuizCard): number {
  const base = { sensitivity: 'base' } as const

  const byCategory = (a.category ?? '').localeCompare(b.category ?? '', undefined, base)
  if (byCategory !== 0) return byCategory

  const firstTag = (c: QuizCard) => (c.tags?.length ? String(c.tags[0]) : '')
  const byTag = firstTag(a).localeCompare(firstTag(b), undefined, base)
  if (byTag !== 0) return byTag

  const seqA = seqSortValue(a.seq)
  const seqB = seqSortValue(b.seq)
  if (seqA !== seqB) return seqA - seqB

  return (a.name ?? '').localeCompare(b.name ?? '', undefined, base)
}

/** Home search matches name and tags, same as polimind. */
export function matchesSearch(card: QuizCard, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    card.name.toLowerCase().includes(q) ||
    card.tags.some((tag) => tag.toLowerCase().includes(q))
  )
}
