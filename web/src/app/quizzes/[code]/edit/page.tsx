'use client'

import { useCallback, useEffect, useState, use } from 'react'
import Link from 'next/link'
import { FaTrashAlt, FaArrowLeft } from 'react-icons/fa'
import FileDrop, { type CheckedFile } from '@/components/FileDrop'
import { deleteList, deleteQuiz, fetchList, uploadQuizzes } from '@/lib/client'
import type { QuizList } from '@/types/list'

/**
 * The edit key lives in the URL fragment, not the query string, so it never
 * reaches a server log or a Referer header. Read here, sent as a header.
 */
function useEditKey(): string | null {
  const [key, setKey] = useState<string | null>(null)
  useEffect(() => {
    const match = /(?:^|[#&])k=([^&]+)/.exec(window.location.hash)
    setKey(match ? decodeURIComponent(match[1]) : '')
  }, [])
  return key
}

export default function EditPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const editKey = useEditKey()
  const [list, setList] = useState<QuizList | null>(null)
  const [files, setFiles] = useState<CheckedFile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  const load = useCallback(async () => {
    setList(await fetchList(code))
  }, [code])

  useEffect(() => {
    load().catch((err: Error) => setError(err.message))
  }, [load])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (editKey === null) return null

  if (!editKey) {
    return (
      <div className="max-w-2xl mx-auto text-center card">
        <p className="font-semibold text-stone-700 dark:text-stone-200">
          This page needs the edit link you were given when the list was published.
        </p>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          It ends in <code className="font-mono">#k=...</code>. Without it there is no
          way to prove you own this list.
        </p>
      </div>
    )
  }

  if (deleted) {
    return (
      <div className="max-w-2xl mx-auto text-center card">
        <p className="font-semibold text-stone-700 dark:text-stone-200">
          List deleted. The link now returns a 404.
        </p>
        <Link href="/" className="inline-block mt-4 btn-secondary">
          Back to home
        </Link>
      </div>
    )
  }

  const invalidCount = files.filter((f) => f.error).length

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link
        href={`/quizzes/${code}`}
        className="inline-flex items-center gap-2 mb-4 font-semibold quiz-accent-link"
      >
        <FaArrowLeft /> Back to the list
      </Link>

      <h1 className="mb-6 text-3xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-4xl">
        Edit {list?.name ?? code}
      </h1>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white">
          Quizzes
        </h2>
        {list && list.quizzes.length === 0 && (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            This list is empty.
          </p>
        )}
        <ul className="space-y-2">
          {list?.quizzes.map((quiz) => (
            <li
              key={quiz.slug}
              className="flex items-center gap-3 p-3 bg-white border-2 rounded-lg border-stone-200 dark:border-stone-700 dark:bg-stone-900"
            >
              <div className="flex-grow min-w-0">
                <div className="font-semibold truncate text-stone-800 dark:text-stone-100">
                  {quiz.name}
                </div>
                <div className="font-mono text-xs text-stone-500 dark:text-stone-400">
                  {quiz.slug}.json &middot; {quiz.questions} questions
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => deleteQuiz(code, editKey, quiz.slug))}
                aria-label={`Delete ${quiz.slug}`}
                className="p-2 text-red-600 rounded shrink-0 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-40"
              >
                <FaTrashAlt aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white">
          Add or replace
        </h2>
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
          Uploading a file whose name already exists replaces that quiz in place.
        </p>
        <FileDrop files={files} onChange={setFiles} />
        <button
          type="button"
          disabled={busy || files.length === 0 || invalidCount > 0}
          onClick={() =>
            run(async () => {
              await uploadQuizzes(code, editKey, files.map((f) => f.file))
              setFiles([])
            })
          }
          className="w-full mt-4 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Uploading...' : 'Upload'}
        </button>
      </section>

      {error && (
        <p className="p-3 mb-6 text-sm font-semibold text-red-700 border-2 border-red-300 rounded-lg bg-red-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="p-4 border-2 rounded-xl border-red-300 dark:border-red-900">
        <h2 className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">
          Delete this list
        </h2>
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-300">
          The shared link stops working immediately and cannot be restored from this
          page.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await deleteList(code, editKey)
              setDeleted(true)
            })
          }
          className="px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40"
        >
          Delete list
        </button>
      </section>
    </div>
  )
}
