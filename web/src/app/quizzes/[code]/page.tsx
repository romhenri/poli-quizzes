import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getList } from '@/lib/api'
import QuizGrid from './QuizGrid'

// Unlisted means unlisted: the link is the only way in, so keep it out of search.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ListPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const list = await getList(code)
  if (!list) notFound()

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-4xl md:text-5xl">
          {list.name}
        </h1>
        {list.description && (
          <p className="mt-2 text-lg text-stone-600 dark:text-stone-300">
            {list.description}
          </p>
        )}
      </header>

      <QuizGrid code={code} quizzes={list.quizzes} />
    </div>
  )
}
