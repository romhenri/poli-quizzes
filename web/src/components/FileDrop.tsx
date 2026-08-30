'use client'

import { useRef, useState } from 'react'
import { FaFileUpload, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa'
import { validateQuiz } from '@/lib/validateQuiz'

export interface CheckedFile {
  file: File
  slug: string
  error: string | null
}

/** Same 1MB cap the API enforces, checked here so the error arrives sooner. */
const MAX_FILE_BYTES = 1_048_576

/**
 * The one place a File becomes a CheckedFile. Exported so a hand-written quiz
 * goes through exactly the same validation as an uploaded one.
 */
export async function checkFile(file: File): Promise<CheckedFile> {
  const slug = file.name.replace(/\.json$/i, '')

  if (!file.name.toLowerCase().endsWith('.json')) {
    return { file, slug, error: 'must be a .json file' }
  }
  if (file.size > MAX_FILE_BYTES) {
    return { file, slug, error: `larger than ${MAX_FILE_BYTES / 1024} KB` }
  }
  try {
    return { file, slug, error: validateQuiz(JSON.parse(await file.text()), slug) }
  } catch (err) {
    return { file, slug, error: `invalid JSON (${(err as Error).message})` }
  }
}

interface FileDropProps {
  files: CheckedFile[]
  onChange: (files: CheckedFile[]) => void
}

export default function FileDrop({ files, onChange }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const add = async (incoming: FileList | null) => {
    if (!incoming?.length) return
    const checked = await Promise.all(Array.from(incoming).map(checkFile))
    // Re-picking the same filename replaces it, matching the API's upsert.
    const bySlug = new Map(files.map((f) => [f.slug, f]))
    for (const item of checked) bySlug.set(item.slug, item)
    onChange([...bySlug.values()])
  }

  const remove = (slug: string) => onChange(files.filter((f) => f.slug !== slug))

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void add(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 px-6 py-10 text-center transition-colors border-2 border-dashed cursor-pointer rounded-xl ${
          dragging
            ? 'border-clay-500 bg-clay-50 dark:bg-stone-800'
            : 'border-stone-300 dark:border-stone-600 hover:border-clay-400'
        }`}
      >
        <FaFileUpload className="text-2xl text-stone-400 dark:text-stone-500" aria-hidden />
        <p className="font-semibold text-stone-700 dark:text-stone-200">
          Drop quiz JSON files here
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          or click to pick them. The filename becomes the quiz URL, so{' '}
          <code className="font-mono">algebra.json</code> needs{' '}
          <code className="font-mono">&quot;id&quot;: &quot;algebra&quot;</code>.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          multiple
          className="hidden"
          onChange={(e) => {
            void add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map(({ file, slug, error }) => (
            <li
              key={slug}
              className={`flex items-start gap-3 p-3 border-2 rounded-lg ${
                error
                  ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                  : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900'
              }`}
            >
              {error ? (
                <FaExclamationTriangle className="mt-1 text-red-500 shrink-0" aria-hidden />
              ) : (
                <FaCheck className="mt-1 text-green-600 shrink-0" aria-hidden />
              )}
              <div className="flex-grow min-w-0">
                <div className="font-mono text-sm font-semibold truncate text-stone-800 dark:text-stone-100">
                  {file.name}
                </div>
                {error && (
                  <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(slug)}
                aria-label={`Remove ${file.name}`}
                className="p-1 shrink-0 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <FaTimes aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
