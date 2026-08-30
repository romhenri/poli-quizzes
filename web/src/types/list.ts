import type { QuizType } from '@/types/quiz'

/** One card on a list page. Shape produced by the API's `_card`. */
export interface QuizCard {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  subcategory?: string | null
  tags: string[]
  hardness?: 'easy' | 'medium' | 'hard'
  type?: QuizType
  seq?: number | string | null
  questions: number
}

export interface QuizList {
  code: string
  name: string
  description: string
  created_at: string
  quizzes: QuizCard[]
}
