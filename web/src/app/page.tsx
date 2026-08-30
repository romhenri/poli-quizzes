import Link from 'next/link'
import { FaUpload, FaLink, FaShareAlt, FaArrowRight } from 'react-icons/fa'

const STEPS = [
  {
    Icon: FaUpload,
    title: 'Upload your JSON',
    body: 'Bring quiz files in polimind format. They are validated on the way in, so a broken correctAnswer never reaches a student.',
  },
  {
    Icon: FaLink,
    title: 'Get a link',
    body: 'Your list lands at /quizzes/<code> with a code nobody can guess. Nothing is listed publicly.',
  },
  {
    Icon: FaShareAlt,
    title: 'Share it',
    body: 'Anyone with the link can play. There is nothing to sign up for, and no password to hand out.',
  },
]

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <section className="py-8 text-center sm:py-14">
        <h1 className="mb-4 text-4xl font-bold tracking-wide font-display text-stone-800 dark:text-white sm:text-5xl md:text-6xl">
          Publish a quiz list. Share one link.
        </h1>
        <p className="max-w-2xl mx-auto mb-8 text-lg text-stone-600 dark:text-stone-300">
          poli-quizzes takes quiz files in{' '}
          <span className="font-semibold">polimind format</span> and turns them into an
          unlisted page you can hand to a class, a study group, or yourself.
        </p>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 btn-primary"
        >
          Create a quiz list
          <FaArrowRight />
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ Icon, title, body }, index) => (
          <div key={title} className="card">
            <div className="flex items-center gap-3 mb-3">
              <Icon className="text-xl text-clay-500 dark:text-clay-400" aria-hidden />
              <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
                Step {index + 1}
              </span>
            </div>
            <h2 className="mb-2 text-xl font-bold tracking-wide font-display text-stone-800 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-300">{body}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm text-center text-stone-500 dark:text-stone-400">
        Unlisted, not private: the link is the password. Anyone you send it to can pass it on.
      </p>
    </div>
  )
}
