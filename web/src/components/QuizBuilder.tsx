'use client'

import { useMemo, useState } from 'react'
import {
  FaPlus,
  FaTrashAlt,
  FaCheckCircle,
  FaRegCircle,
  FaExclamationTriangle,
} from 'react-icons/fa'
import { AVAILABLE_COLORS } from '@/utils/colorMapper'
import { ICON_NAMES } from '@/utils/iconMapper'
import { validateQuiz } from '@/lib/validateQuiz'
import { slugify } from '@/lib/slug'
import { checkFile, type CheckedFile } from '@/components/FileDrop'

interface DraftQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explain: string
}

const emptyQuestion = (): DraftQuestion => ({
  question: '',
  options: ['', ''],
  correctAnswer: 0,
  explain: '',
})

const HARDNESS = ['easy', 'medium', 'hard'] as const

const field =
  'w-full px-3 py-2 bg-white border-2 rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 text-stone-800 dark:text-stone-100'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block mb-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
      {children}
    </span>
  )
}

/**
 * Builds a quiz JSON by hand instead of uploading one.
 *
 * The output is an ordinary quiz file handed to the same `checkFile` an upload
 * goes through, so there is no second validation path and no new API surface.
 */
export default function QuizBuilder({
  onAdd,
}: {
  onAdd: (file: CheckedFile) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [color, setColor] = useState('blue')
  const [icon, setIcon] = useState('')
  const [tags, setTags] = useState('')
  const [hardness, setHardness] = useState<(typeof HARDNESS)[number]>('easy')
  const [lang, setLang] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()])
  const [showErrors, setShowErrors] = useState(false)

  const slug = slugify(name)

  const payload = useMemo(() => {
    const built: Record<string, unknown> = {
      id: slug,
      name: name.trim(),
      description: description.trim(),
      color,
      category: category.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      hardness,
      questions: questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()),
        correctAnswer: q.correctAnswer,
        // Omitted rather than sent empty: the schema wants it absent or a string.
        ...(q.explain.trim() ? { explain: q.explain.trim() } : {}),
      })),
    }
    if (icon) built.icon = icon
    if (lang.trim()) built.lang = lang.trim()
    return built
  }, [slug, name, description, color, category, tags, hardness, icon, lang, questions])

  // The same validator the API and the dropzone use, run live as you type.
  const error = validateQuiz(payload, slug)

  const patch = (index: number, changes: Partial<DraftQuestion>) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...changes } : q))
    )

  const setOption = (qi: number, oi: number, value: string) =>
    patch(qi, {
      options: questions[qi].options.map((o, i) => (i === oi ? value : o)),
    })

  const addOption = (qi: number) =>
    patch(qi, { options: [...questions[qi].options, ''] })

  const removeOption = (qi: number, oi: number) => {
    const q = questions[qi]
    if (q.options.length <= 2) return // the validator needs at least two
    patch(qi, {
      options: q.options.filter((_, i) => i !== oi),
      // Keep the marked answer pointing at the same option it did before.
      correctAnswer:
        q.correctAnswer === oi
          ? 0
          : q.correctAnswer > oi
            ? q.correctAnswer - 1
            : q.correctAnswer,
    })
  }

  const add = async () => {
    if (error) {
      setShowErrors(true)
      return
    }
    const file = new File([JSON.stringify(payload, null, 2)], `${slug}.json`, {
      type: 'application/json',
    })
    onAdd(await checkFile(file))
    setName('')
    setDescription('')
    setTags('')
    setLang('')
    setQuestions([emptyQuestion()])
    setShowErrors(false)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 card">
        <label className="block">
          <Label>Quiz name</Label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Limites e Continuidade"
            className={field}
          />
          {name.trim() && (
            <span className="block mt-1 font-mono text-xs text-stone-500 dark:text-stone-400">
              {slug}.json
            </span>
          )}
        </label>

        <label className="block">
          <Label>Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What this quiz covers."
            className={field}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Label>Category</Label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={field}
            />
          </label>

          <label className="block">
            <Label>Tags <span className="font-normal text-stone-500">(comma separated)</span></Label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="math, limits"
              className={field}
            />
          </label>

          <label className="block">
            <Label>Colour</Label>
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 border-2 rounded-lg shrink-0 border-stone-300 dark:border-stone-600"
                style={{ backgroundColor: AVAILABLE_COLORS[color] }}
                aria-hidden
              />
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className={field}
              >
                {Object.keys(AVAILABLE_COLORS).map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="block">
            <Label>Icon <span className="font-normal text-stone-500">(optional)</span></Label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className={field}
            >
              <option value="">from category</option>
              {ICON_NAMES.map((iconName) => (
                <option key={iconName} value={iconName}>
                  {iconName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <Label>Difficulty</Label>
            <select
              value={hardness}
              onChange={(e) => setHardness(e.target.value as typeof hardness)}
              className={field}
            >
              {HARDNESS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <Label>Language <span className="font-normal text-stone-500">(optional)</span></Label>
            <input
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              placeholder="pt"
              className={field}
            />
          </label>
        </div>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="space-y-3 card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-wide font-display text-stone-800 dark:text-white">
              Question {qi + 1}
            </h3>
            {questions.length > 1 && (
              <button
                type="button"
                onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}
                aria-label={`Remove question ${qi + 1}`}
                className="p-2 text-red-600 rounded hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <FaTrashAlt aria-hidden />
              </button>
            )}
          </div>

          <textarea
            value={q.question}
            onChange={(e) => patch(qi, { question: e.target.value })}
            rows={2}
            placeholder="Ask the question."
            className={field}
          />

          <div>
            <Label>Options <span className="font-normal text-stone-500">(click the circle to mark the correct one)</span></Label>
            <div className="space-y-2">
              {q.options.map((option, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => patch(qi, { correctAnswer: oi })}
                    aria-label={`Mark option ${String.fromCharCode(65 + oi)} correct`}
                    aria-pressed={q.correctAnswer === oi}
                    className={
                      q.correctAnswer === oi
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-stone-300 hover:text-stone-500 dark:text-stone-600'
                    }
                  >
                    {q.correctAnswer === oi ? <FaCheckCircle /> : <FaRegCircle />}
                  </button>
                  <span className="w-5 text-sm font-bold text-stone-500 dark:text-stone-400">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <input
                    value={option}
                    onChange={(e) => setOption(qi, oi, e.target.value)}
                    className={field}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(qi, oi)}
                    disabled={q.options.length <= 2}
                    aria-label={`Remove option ${String.fromCharCode(65 + oi)}`}
                    className="p-2 shrink-0 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <FaTrashAlt aria-hidden />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addOption(qi)}
              className="flex items-center gap-2 mt-2 text-sm font-semibold quiz-accent-link"
            >
              <FaPlus aria-hidden /> Add option
            </button>
          </div>

          <label className="block">
            <Label>Explanation <span className="font-normal text-stone-500">(optional, shown after answering)</span></Label>
            <textarea
              value={q.explain}
              onChange={(e) => patch(qi, { explain: e.target.value })}
              rows={2}
              className={field}
            />
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
        className="flex items-center justify-center w-full gap-2 btn-secondary"
      >
        <FaPlus aria-hidden /> Add question
      </button>

      {showErrors && error && (
        <p className="flex items-start gap-2 p-3 text-sm font-semibold text-red-700 border-2 border-red-300 rounded-lg bg-red-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <FaExclamationTriangle className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <button type="button" onClick={add} className="w-full btn-primary">
        Add this quiz
      </button>
    </div>
  )
}
