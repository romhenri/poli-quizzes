'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaArrowRight, FaCopy, FaCheck, FaExclamationTriangle } from 'react-icons/fa'
import FileDrop, { type CheckedFile } from '@/components/FileDrop'
import { createList, deleteList, uploadQuizzes } from '@/lib/client'

interface Published {
  code: string
  editKey: string
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <div className="mb-1 text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
        {label}
      </div>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-grow min-w-0 px-3 py-2 font-mono text-sm bg-white border-2 rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 text-stone-800 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="flex items-center gap-2 px-4 font-semibold border-2 rounded-lg shrink-0 border-clay-500 text-clay-700 dark:text-clay-300 dark:border-clay-400"
        >
          {copied ? <FaCheck aria-hidden /> : <FaCopy aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function SuccessScreen({ code, editKey }: Published) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="mb-6 text-3xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-4xl">
        Published.
      </h1>

      <div className="space-y-5 card">
        <CopyRow label="Share this link" value={`${origin}/quizzes/${code}`} />
        <CopyRow label="Edit link (keep it)" value={`${origin}/quizzes/${code}/edit#k=${editKey}`} />

        <div className="flex items-start gap-3 p-4 border-2 rounded-lg border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40">
          <FaExclamationTriangle className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden />
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            The edit link is shown once and is never emailed, stored, or recoverable.
            Copy it somewhere safe now. Lose it and this list can never be changed or
            deleted again.
          </p>
        </div>
      </div>

      <Link
        href={`/quizzes/${code}`}
        className="inline-flex items-center gap-2 mt-6 btn-primary"
      >
        Open the list
        <FaArrowRight />
      </Link>
    </div>
  )
}

export default function NewListPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<CheckedFile[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState<Published | null>(null)

  const invalidCount = files.filter((f) => f.error).length
  const canPublish =
    name.trim().length > 0 && files.length > 0 && invalidCount === 0 && !busy

  const publish = async () => {
    setBusy(true)
    setError(null)
    try {
      const { code, edit_key } = await createList(name.trim(), description.trim())
      try {
        await uploadQuizzes(code, edit_key, files.map((f) => f.file))
      } catch (err) {
        // Publishing is one user action, so a failed upload must not leave a
        // named but empty list behind, nor orphan another one on retry.
        await deleteList(code, edit_key).catch(() => {})
        throw err
      }
      setPublished({ code, editKey: edit_key })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (published) return <SuccessScreen {...published} />

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="mb-2 text-3xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-4xl">
        New quiz list
      </h1>
      <p className="mb-8 text-stone-600 dark:text-stone-300">
        Name it, drop your JSON in, publish. You get a link and an edit key.
      </p>

      <div className="space-y-6">
        <label className="block">
          <span className="block mb-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
            List name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Prova de Cálculo 2, turma B"
            className="w-full px-3 py-2 bg-white border-2 rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 text-stone-800 dark:text-stone-100"
          />
        </label>

        <label className="block">
          <span className="block mb-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
            Description <span className="font-normal text-stone-500">(optional)</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full px-3 py-2 bg-white border-2 rounded-lg border-stone-300 dark:border-stone-600 dark:bg-stone-900 text-stone-800 dark:text-stone-100"
          />
        </label>

        <FileDrop files={files} onChange={setFiles} />

        {error && (
          <p className="p-3 text-sm font-semibold text-red-700 border-2 border-red-300 rounded-lg bg-red-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={publish}
          disabled={!canPublish}
          className="w-full btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Publishing...' : 'Publish'}
        </button>

        {invalidCount > 0 && (
          <p className="text-sm text-center text-stone-500 dark:text-stone-400">
            Fix or remove {invalidCount} file{invalidCount > 1 ? 's' : ''} to publish.
          </p>
        )}
      </div>
    </div>
  )
}
