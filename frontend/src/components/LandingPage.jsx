import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore.js'

const featureBlocks = [
  {
    title: 'Live Whiteboards',
    description: 'Draw, write, and explain concepts in one clean board for classes and groups.',
  },
  {
    title: 'Simple Sharing',
    description: 'Share board links quickly so others can view and follow your explanation.',
  },
  {
    title: 'Board Dashboard',
    description: 'Create, rename, and organize boards from a focused dashboard view.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()

  const goToDashboard = useCallback(() => {
    navigate('/dashboard')
  }, [navigate])

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
          <div>
            <p className="text-2xl font-bold text-blue-600">Class Flow</p>
            <p className="text-xs uppercase tracking-[0.14em] text-gray-500">Smart Whiteboard Workspace</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10 sm:px-10">
        <section className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12">
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
            A simple whiteboard app for classes and collaborative learning.
          </h1>
          <p className="mt-5 max-w-3xl text-base text-gray-600 sm:text-lg">
            Create boards, explain ideas visually, and keep discussions organized in one place.
            Class Flow is designed to stay clear, fast, and easy for day-to-day classroom work.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={goToDashboard}
              className="rounded-lg border border-blue-200 px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              {token ? 'Go to Dashboard' : 'Open Dashboard'}
            </button>
          </div>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {featureBlocks.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{feature.description}</p>
            </article>
          ))}
        </section>rt
      </main>
    </div>
  )
}
