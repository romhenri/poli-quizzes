'use client'

import { type CSSProperties } from 'react'
import Link from 'next/link'
import { FaArrowRight, FaQuestionCircle, FaCheck } from 'react-icons/fa'
import { getColor } from '@/utils/colorMapper'
import { getQuizIcon } from '@/utils/iconMapper'
import type { QuizCard } from '@/types/list'
import type { Score } from '@/lib/progress'

type Hardness = 'easy' | 'medium' | 'hard'

const DOTS_BY_HARDNESS: Record<Hardness, number> = { easy: 1, medium: 2, hard: 3 }

const HARDNESS_TITLE: Record<Hardness, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
}

interface SubjectCardProps {
  subject: QuizCard
  href: string
  index: number
  onTagClick?: (tag: string) => void
  /** Best score from localStorage, if this browser has played it before. */
  score?: Score
}

export default function SubjectCard({
  subject,
  href,
  index,
  onTagClick,
  score,
}: SubjectCardProps) {
  const bgColor = getColor(subject.color)
  const Icon = getQuizIcon(subject.icon, subject.category)
  const hardness: Hardness = subject.hardness ?? 'easy'

  return (
    <div
      className="relative flex flex-col justify-between h-full cursor-pointer card card-hover"
      style={{ animationDelay: `${index * 0.1}s`, '--qc': bgColor } as CSSProperties}
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Start quiz: ${subject.name}`}
      />
      {score && (
        <div
          className="absolute z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white rounded-full pointer-events-none top-4 right-4"
          style={{ backgroundColor: bgColor }}
        >
          <FaCheck aria-hidden />
          {score.correct}/{score.total}
        </div>
      )}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between pointer-events-none">
        <div>
          <div className="mb-4">
            <div
              className="inline-flex items-center justify-center mb-3 text-white w-14 h-14 rounded-xl sm:w-16 sm:h-16"
              style={{ backgroundColor: bgColor }}
            >
              <Icon className="text-2xl sm:text-3xl" aria-hidden />
            </div>
            <h3 className="font-display text-xl font-bold tracking-wide text-stone-800 dark:text-white sm:text-2xl">
              {subject.name}
            </h3>
          </div>

          <p className="mb-3 font-medium text-stone-700 dark:text-stone-200 line-clamp-2">
            {subject.description}
          </p>

          <div
            className={`mb-4 flex flex-nowrap gap-2 overflow-hidden ${onTagClick ? 'pointer-events-auto' : ''}`}
          >
            {subject.tags.map((tag, idx) =>
              onTagClick ? (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    onTagClick(tag)
                  }}
                  className="px-2 py-1 text-xs font-semibold transition-colors rounded-md whitespace-nowrap quiz-tag quiz-tag-interactive quiz-accent"
                >
                  {tag}
                </button>
              ) : (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap quiz-tag quiz-accent"
                >
                  {tag}
                </span>
              )
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-400 sm:text-sm">
            <FaQuestionCircle />
            <span>
              {subject.questions} {subject.questions === 1 ? 'question' : 'questions'}
            </span>
            <span className="flex items-center gap-0.5" title={HARDNESS_TITLE[hardness]}>
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 rounded-full ${i <= DOTS_BY_HARDNESS[hardness] ? 'bg-current opacity-100' : 'bg-current opacity-30'}`}
                  aria-hidden
                />
              ))}
            </span>
          </div>
          <div className="flex items-center gap-2 font-semibold quiz-accent">
            {score ? 'Play again' : 'Start'}
            <FaArrowRight />
          </div>
        </div>
      </div>
    </div>
  )
}
