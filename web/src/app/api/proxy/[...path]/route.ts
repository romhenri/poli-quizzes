import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Writes come from the browser, so they need one same-origin door. This
 * forwards them verbatim, which is why there is no CORS config anywhere.
 *
 * It is a passthrough, not a gatekeeper: the API still checks the edit key.
 */
async function forward(req: NextRequest, path: string[]) {
  if (path[0] !== 'lists') {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 })
  }

  const headers = new Headers()
  for (const name of ['content-type', 'x-edit-key']) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }

  // Buffered rather than streamed: uploads are capped at 1MB per file anyway,
  // and a stream body would need duplex: 'half' plus a compatible runtime.
  const body = req.method === 'GET' ? undefined : await req.arrayBuffer()

  const upstream = await fetch(`${API_URL}/${path.join('/')}`, {
    method: req.method,
    headers,
    body,
    cache: 'no-store',
  })

  if (upstream.status === 204) return new NextResponse(null, { status: 204 })

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  })
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path)
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return forward(req, (await params).path)
}
