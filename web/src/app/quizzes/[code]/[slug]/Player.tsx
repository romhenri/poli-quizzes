'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { FaArrowLeft, FaPause, FaPlay } from 'react-icons/fa'
import QuestionCard from '@/components/QuestionCard'
import QuizResults from '@/components/QuizResults'
import { useQuizMode } from '@/contexts/QuizModeContext'
import { shuffleAllQuestionOptions } from '@/utils/shuffleOptions'
import { writeScore } from '@/lib/progress'
import {
  Question,
  QuizMetadata,
  QuizState,
  isAnswerCorrect,
  normalizeQuizType,
} from '@/types/quiz'

const EMPTY_STATE: QuizState = {
  currentQuestionIndex: 0,
  answers: [],
  startTime: 0,
  questionTimes: [],
  isFinished: false,
}

export default function Player({
  code,
  slug,
  quiz,
}: {
  code: string
  slug: string
  quiz: QuizMetadata
}) {
  const { isDynamicMode, timeLimit } = useQuizMode()
  const backHref = `/quizzes/${code}`
  const quizType = normalizeQuizType(quiz.type)
  const mathEnabled = (quiz.tags ?? []).some((t) => String(t).toLowerCase() === 'math')

  // Shuffled on the client so the server render stays deterministic.
  const [questions, setQuestions] = useState<Question[]>(quiz.questions)
  useEffect(() => {
    setQuestions(shuffleAllQuestionOptions(quiz.questions, quizType))
  }, [quiz.questions, quizType])

  const [quizState, setQuizState] = useState<QuizState>({
    ...EMPTY_STATE,
    startTime: Date.now(),
  })
  const [isPaused, setIsPaused] = useState(false)

  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const advanceDeadlineRef = useRef<number | null>(null)
  const pausedRemainingRef = useRef<number | null>(null)

  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current !== null) {
      clearTimeout(autoAdvanceRef.current)
      autoAdvanceRef.current = null
    }
    advanceDeadlineRef.current = null
  }

  const advance = useCallback((delayMs: number) => {
    clearAutoAdvance()
    advanceDeadlineRef.current = Date.now() + delayMs
    autoAdvanceRef.current = setTimeout(() => {
      autoAdvanceRef.current = null
      advanceDeadlineRef.current = null
      setQuizState((prev) => {
        const len = questions.length
        if (len === 0) return prev
        if (prev.currentQuestionIndex < len - 1) {
          return { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
        }
        return { ...prev, isFinished: true }
      })
    }, delayMs)
  }, [questions.length])

  useEffect(() => () => clearAutoAdvance(), [])

  useEffect(() => {
    if (isPaused) {
      if (autoAdvanceRef.current !== null && advanceDeadlineRef.current !== null) {
        const remaining = Math.max(advanceDeadlineRef.current - Date.now(), 0)
        clearAutoAdvance()
        pausedRemainingRef.current = remaining
      }
    } else if (pausedRemainingRef.current !== null) {
      const remaining = pausedRemainingRef.current
      pausedRemainingRef.current = null
      advance(remaining)
    }
  }, [isPaused, advance])

  const togglePause = () => setIsPaused((prev) => !prev)

  const handleAnswer = (selectedAnswer: number, timeTaken: number) => {
    setQuizState((prev) => {
      const current = questions[prev.currentQuestionIndex]
      if (!current) return prev
      return {
        ...prev,
        answers: [
          ...prev.answers,
          {
            questionIndex: prev.currentQuestionIndex,
            selectedAnswer,
            isCorrect: isAnswerCorrect(current, quizType, selectedAnswer),
            timeTaken,
            wasAttempted: true,
          },
        ],
        questionTimes: [...prev.questionTimes, timeTaken],
      }
    })
    if (isDynamicMode) advance(1500)
  }

  const handleNext = () => {
    clearAutoAdvance()
    setQuizState((prev) =>
      prev.currentQuestionIndex < questions.length - 1
        ? { ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }
        : { ...prev, isFinished: true }
    )
  }

  const handleTimeOut = () => {
    setQuizState((prev) => {
      const current = questions[prev.currentQuestionIndex]
      if (!current) return prev
      return {
        ...prev,
        answers: [
          ...prev.answers,
          {
            questionIndex: prev.currentQuestionIndex,
            selectedAnswer: -1,
            isCorrect: false,
            timeTaken: timeLimit,
            wasAttempted: false,
          },
        ],
        questionTimes: [...prev.questionTimes, timeLimit],
      }
    })
    advance(1000)
  }

  const handleRestart = () => {
    clearAutoAdvance()
    pausedRemainingRef.current = null
    setIsPaused(false)
    setQuestions((prev) => shuffleAllQuestionOptions(prev, quizType))
    setQuizState({ ...EMPTY_STATE, startTime: Date.now() })
  }

  const recordScore = useCallback(
    (correct: number, total: number) => writeScore(code, slug, { correct, total }),
    [code, slug]
  )

  if (quizState.isFinished) {
    return (
      <QuizResults
        questions={questions}
        quizType={quizType}
        quizLang={quiz.lang}
        quizState={quizState}
        quizName={quiz.name}
        backHref={backHref}
        mathEnabled={mathEnabled}
        onRestart={handleRestart}
        onComplete={recordScore}
      />
    )
  }

  const currentQuestion = questions[quizState.currentQuestionIndex]
  const progress = ((quizState.currentQuestionIndex + 1) / questions.length) * 100
  const correctAnswers = quizState.answers.filter((a) => a.isCorrect).length
  const totalAnswered = quizState.answers.length
  const currentPercentage =
    totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="items-center justify-between hidden sm:flex sm:mb-4">
          <Link href={backHref} className="inline-flex items-center gap-2 font-semibold quiz-accent-link">
            <FaArrowLeft /> Back
          </Link>
          {isDynamicMode && (
            <button
              type="button"
              onClick={togglePause}
              className="inline-flex items-center gap-2 font-semibold quiz-accent-link"
            >
              {isPaused ? <FaPlay /> : <FaPause />} {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between my-2 sm:mb-4">
          <h1 className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-3xl md:text-4xl">
            {quiz.name}
          </h1>
          {totalAnswered > 0 && (
            <div className="text-right">
              <div className="text-xl font-bold text-clay-600 dark:text-clay-400 sm:text-3xl">
                {currentPercentage}%
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 sm:text-sm">
                {correctAnswers}/{totalAnswered} correct
              </div>
            </div>
          )}
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        quizType={quizType}
        lang={quiz.lang}
        questionNumber={quizState.currentQuestionIndex + 1}
        currentCorrect={correctAnswers}
        mathEnabled={mathEnabled}
        isPaused={isPaused}
        onTogglePause={togglePause}
        onAnswer={handleAnswer}
        onTimeOut={handleTimeOut}
        onNext={handleNext}
      />

      <div className="mt-4 sm:mt-6">
        <div className="h-2 overflow-hidden rounded-full sm:h-3 bg-stone-200 dark:bg-stone-700">
          <div
            className="h-full transition-all duration-500 bg-clay-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="hidden mt-1 text-xs text-center text-stone-600 dark:text-stone-400 sm:mt-2 sm:text-sm sm:block">
          Question {quizState.currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>
    </div>
  )
}
