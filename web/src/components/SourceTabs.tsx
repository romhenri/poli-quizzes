'use client'

import { FaFileUpload, FaPen } from 'react-icons/fa'

export type Source = 'upload' | 'write'

/** Upload a JSON file, or write the quiz here. Both end up as the same file. */
export default function SourceTabs({
  value,
  onChange,
}: {
  value: Source
  onChange: (source: Source) => void
}) {
  const tabs: { id: Source; label: string; Icon: typeof FaPen }[] = [
    { id: 'upload', label: 'Upload JSON', Icon: FaFileUpload },
    { id: 'write', label: 'Write a quiz', Icon: FaPen },
  ]

  return (
    <div
      role="tablist"
      className="flex gap-1 p-1 mb-6 rounded-lg bg-stone-200 dark:bg-stone-800"
    >
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors rounded-md ${
            value === id
              ? 'bg-white text-stone-900 dark:bg-stone-950 dark:text-white'
              : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
          }`}
        >
          <Icon aria-hidden />
          {label}
        </button>
      ))}
    </div>
  )
}
