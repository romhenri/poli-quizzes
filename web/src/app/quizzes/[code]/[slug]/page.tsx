import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getQuiz } from '@/lib/api'
import Player from './Player'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function QuizPage({
  params,
}: {
  params: Promise<{ code: string; slug: string }>
}) {
  const { code, slug } = await params
  const quiz = await getQuiz(code, slug)
  if (!quiz) notFound()

  return <Player code={code} slug={slug} quiz={quiz} />
}
