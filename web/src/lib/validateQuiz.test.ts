/** Both validators run against fixtures/. See fixtures/README.md. */
import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { validateQuiz } from '@/lib/validateQuiz'

const FIXTURES = path.resolve(__dirname, '../../../fixtures')

const cases = (kind: 'valid' | 'invalid') =>
  readdirSync(path.join(FIXTURES, kind))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({
      slug: file.slice(0, -'.json'.length),
      payload: JSON.parse(readFileSync(path.join(FIXTURES, kind, file), 'utf8')),
    }))

describe('validateQuiz', () => {
  it('has fixtures to run against', () => {
    // Guards against a glob typo silently turning this suite into a no-op.
    expect(cases('valid').length).toBeGreaterThan(0)
    expect(cases('invalid').length).toBeGreaterThan(0)
  })

  it.each(cases('valid'))('accepts valid/$slug', ({ slug, payload }) => {
    expect(validateQuiz(payload, slug)).toBeNull()
  })

  it.each(cases('invalid'))('rejects invalid/$slug', ({ slug, payload }) => {
    const error = validateQuiz(payload, slug)
    expect(error).toBeTypeOf('string')
    expect(error).not.toHaveLength(0)
  })
})
