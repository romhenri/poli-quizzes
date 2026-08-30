/**
 * Turn a quiz name into its filename slug.
 *
 * The slug is the URL segment and must equal the quiz's `id`, so it has to
 * survive being typed and pasted: ASCII, lowercase, hyphen-separated.
 */

// Kept in step with RESERVED_SLUGS in validateQuiz.ts: `/quizzes/<code>/edit`
// is a real page, and Next resolves a static segment before a dynamic one.
const RESERVED = ['edit']

export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip the accents NFD just split off
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) return 'quiz'
  return RESERVED.includes(slug) ? `${slug}-quiz` : slug
}
