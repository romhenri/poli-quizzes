'use client'

import type { QuizList } from '@/types/list'

/** Every call goes through the same-origin proxy at /api/proxy. */
const PROXY = '/api/proxy'

async function detail(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) return body.detail[0]?.msg ?? 'Invalid request'
  } catch {
    // Fall through to the status line.
  }
  return `Request failed (${res.status})`
}

export async function fetchList(code: string): Promise<QuizList> {
  const res = await fetch(`${PROXY}/lists/${code}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export async function createList(
  name: string,
  description: string
): Promise<{ code: string; edit_key: string }> {
  const res = await fetch(`${PROXY}/lists`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export async function uploadQuizzes(
  code: string,
  editKey: string,
  files: File[]
): Promise<void> {
  const form = new FormData()
  for (const file of files) form.append('files', file, file.name)

  const res = await fetch(`${PROXY}/lists/${code}/quizzes`, {
    method: 'POST',
    headers: { 'x-edit-key': editKey },
    body: form,
  })
  if (!res.ok) throw new Error(await detail(res))
}

export async function deleteQuiz(
  code: string,
  editKey: string,
  slug: string
): Promise<void> {
  const res = await fetch(`${PROXY}/lists/${code}/quizzes/${slug}`, {
    method: 'DELETE',
    headers: { 'x-edit-key': editKey },
  })
  if (!res.ok) throw new Error(await detail(res))
}

export async function deleteList(code: string, editKey: string): Promise<void> {
  const res = await fetch(`${PROXY}/lists/${code}`, {
    method: 'DELETE',
    headers: { 'x-edit-key': editKey },
  })
  if (!res.ok) throw new Error(await detail(res))
}
