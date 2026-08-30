'use client'

import { useEffect, useMemo, useState } from 'react'
import { FaSearch } from 'react-icons/fa'
import SubjectCard from '@/components/SubjectCard'
import { compareCards, matchesSearch } from '@/lib/order'
import { readScore, type Score } from '@/lib/progress'
import type { QuizCard } from '@/types/list'

export default function QuizGrid({
  code,
  quizzes,
}: {
  code: string
  quizzes: QuizCard[]
}) {
  const [query, setQuery] = useState('')
  const [scores, setScores] = useState<Record<string, Score>>({})

  // localStorage is browser-only, so scores arrive after hydration.
  useEffect(() => {
    const found: Record<string, Score> = {}
    for (const quiz of quizzes) {
      const score = readScore(code, quiz.slug)
      if (score) found[quiz.slug] = score
    }
    setScores(found)
  }, [code, quizzes])

  const ordered = useMemo(
    () => [...quizzes].sort(compareCards).filter((q) => matchesSearch(q, query)),
    [quizzes, query]
  )

  if (quizzes.length === 0) {
    return (
      <p className="py-12 text-center text-stone-500 dark:text-stone-400">
        This list has no quizzes yet.
      </p>
    )
  }

  return (
    <>
      <div className="relative mb-6">
        <FaSearch
          className="absolute -translate-y-1/2 left-3 top-1/2 text-stone-400"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or tag"
          aria-label="Search quizzes"
          className="w-full py-2 pl-10 pr-3 bg-white border-2 rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 text-stone-800 dark:text-stone-100"
        />
      </div>

      {ordered.length === 0 ? (
        <p className="py-12 text-center text-stone-500 dark:text-stone-400">
          Nothing matches “{query}”.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((quiz, index) => (
            <SubjectCard
              key={quiz.slug}
              subject={quiz}
              href={`/quizzes/${code}/${quiz.slug}`}
              index={index}
              score={scores[quiz.slug]}
              onTagClick={setQuery}
            />
          ))}
        </div>
      )}
    </>
  )
}
