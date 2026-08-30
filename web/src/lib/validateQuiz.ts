/**
 * Full validation of a polimind-format quiz.
 *
 * Deliberately hand-written and duplicated in api/app/validation.py.
 * fixtures/ is what keeps the two honest. Change one, run both suites.
 *
 * Returns null when valid, or a message meant to be shown to the uploader.
 */

// Day one ships `options` only. `bool` and `classify` are real polimind types,
// so they are recognised and rejected explicitly rather than silently accepted.
const SUPPORTED_TYPES = ['options']
const KNOWN_TYPES = ['options', 'bool', 'classify']
const HARDNESS = ['easy', 'medium', 'hard']

// `/quizzes/<code>/edit` is a real page, and Next resolves a static segment
// before a dynamic one, so a quiz with this slug would be unreachable.
const RESERVED_SLUGS = ['edit']


const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

function checkSeq(value: unknown): string | null {
  // polimind accepts a number or a numeric string; anything else is a typo.
  if (value === undefined || value === null) return null
  if (typeof value === 'number' && Number.isInteger(value)) return null
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return null
  return '`seq` must be an integer or a numeric string'
}

function checkQuestion(question: unknown, index: number): string | null {
  const where = `questions[${index}]`
  if (typeof question !== 'object' || question === null || Array.isArray(question)) {
    return `${where} must be an object`
  }
  const q = question as Record<string, unknown>

  if (!isNonEmptyString(q.question)) {
    return `${where}.question is required and must be a non-empty string`
  }

  const options = q.options
  if (!Array.isArray(options)) return `${where}.options must be an array`
  if (options.length < 2) return `${where}.options needs at least 2 choices`
  if (!options.every(isNonEmptyString)) {
    return `${where}.options must all be non-empty strings`
  }

  const correct = q.correctAnswer
  if (typeof correct !== 'number' || !Number.isInteger(correct)) {
    return `${where}.correctAnswer must be an integer index into options`
  }
  if (correct < 0 || correct >= options.length) {
    return `${where}.correctAnswer is ${correct}, outside the range 0..${options.length - 1}`
  }

  if (q.explain != null && typeof q.explain !== 'string') {
    return `${where}.explain must be a string when present`
  }

  return null
}

export function validateQuiz(payload: unknown, slug: string): string | null {
  if (Array.isArray(payload)) {
    // 9 of polimind's own files are undocumented [pt, en] bilingual pairs.
    // Rejected by name rather than by "not an object", so the uploader knows
    // what is actually wrong with the file.
    return 'this looks like a bilingual [pt, en] quiz pair, which is not supported yet; upload one language as a single JSON object'
  }
  if (typeof payload !== 'object' || payload === null) {
    return 'the root of a quiz file must be a JSON object'
  }
  const quiz = payload as Record<string, unknown>

  const quizType = quiz.type == null ? 'options' : quiz.type
  if (typeof quizType !== 'string' || !KNOWN_TYPES.includes(quizType)) {
    return `unknown quiz type ${JSON.stringify(quizType)}; expected one of ${[...KNOWN_TYPES].sort().join(', ')}`
  }
  if (!SUPPORTED_TYPES.includes(quizType)) {
    return `quiz type '${quizType}' is not supported yet; only \`options\` quizzes can be uploaded`
  }

  if (RESERVED_SLUGS.includes(slug)) {
    return `'${slug}' is a reserved name; rename the file`
  }

  if (!isNonEmptyString(quiz.id)) {
    return '`id` is required and must be a non-empty string'
  }
  if (quiz.id !== slug) {
    return `\`id\` is '${quiz.id}' but the filename is '${slug}'; they must match`
  }

  for (const key of ['name', 'description', 'color', 'category'] as const) {
    if (!isNonEmptyString(quiz[key])) {
      return `\`${key}\` is required and must be a non-empty string`
    }
  }

  if (!Array.isArray(quiz.tags) || !quiz.tags.every((t) => typeof t === 'string')) {
    return '`tags` is required and must be an array of strings'
  }

  if (quiz.hardness != null && !HARDNESS.includes(quiz.hardness as string)) {
    return `\`hardness\` must be one of ${[...HARDNESS].sort().join(', ')}`
  }

  for (const key of ['icon', 'lang', 'subcategory'] as const) {
    if (quiz[key] != null && typeof quiz[key] !== 'string') {
      return `\`${key}\` must be a string when present`
    }
  }

  const seqError = checkSeq(quiz.seq)
  if (seqError) return seqError

  if (!Array.isArray(quiz.questions)) {
    return '`questions` is required and must be an array'
  }
  if (quiz.questions.length === 0) return 'a quiz needs at least one question'

  for (let i = 0; i < quiz.questions.length; i++) {
    const error = checkQuestion(quiz.questions[i], i)
    if (error) return error
  }

  return null
}
