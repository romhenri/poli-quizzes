import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import 'katex/dist/katex.min.css'
import { QuizModeProvider } from '@/contexts/QuizModeContext'

const inter = Inter({ subsets: ['latin'] })
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'poli-quizzes',
  description: 'Publish a quiz list and share it with one link. No accounts.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${cormorant.variable}`}>
        <QuizModeProvider>
        <div className="flex min-h-[100svh] flex-col bg-marble dark:bg-stone-950">
          <header className="border-b-2 border-stone-200 dark:border-stone-800">
            <div className="container flex items-center justify-between max-w-6xl px-4 py-4 mx-auto">
              <Link
                href="/"
                className="text-2xl font-bold tracking-wide font-display text-stone-800 dark:text-white"
              >
                poli-quizzes
              </Link>
              <Link href="/new" className="text-sm font-semibold quiz-accent-link">
                Create a list
              </Link>
            </div>
          </header>
          <main className="container flex-grow max-w-6xl px-4 py-6 mx-auto overflow-x-hidden md:py-10">
            {children}
          </main>
        </div>
        </QuizModeProvider>
      </body>
    </html>
  )
}
