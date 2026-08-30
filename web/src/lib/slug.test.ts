import { describe, expect, it } from 'vitest'
import { slugify } from '@/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('American History')).toBe('american-history')
  })

  it('strips accents, because the slug becomes a URL', () => {
    expect(slugify('Prova de Cálculo')).toBe('prova-de-calculo')
    expect(slugify('Introdução à Lógica')).toBe('introducao-a-logica')
  })

  it('collapses punctuation and runs of separators', () => {
    expect(slugify('Algebra: linear!!  (part 2)')).toBe('algebra-linear-part-2')
    expect(slugify('a---b')).toBe('a-b')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  -- hello -- ')).toBe('hello')
  })

  it('falls back when nothing survives', () => {
    expect(slugify('')).toBe('quiz')
    expect(slugify('!!!')).toBe('quiz')
    expect(slugify('日本語')).toBe('quiz')
  })

  it('escapes the reserved slug, which would be unreachable as a route', () => {
    expect(slugify('edit')).toBe('edit-quiz')
    expect(slugify('Edit')).toBe('edit-quiz')
  })
})
