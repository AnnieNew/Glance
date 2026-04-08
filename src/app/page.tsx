import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between">
        <span className="font-semibold tracking-tight">Glance.</span>
        <Link
          href="/login"
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 pb-24 max-w-lg">
        <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
          Your stocks.<br />One signal.<br />Every morning.
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed mb-8 max-w-sm">
          Glance cuts through financial noise — sending you a daily 15-second read with only the news that actually shifts your thinking.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/signup"
            className="bg-black text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="border border-zinc-200 text-zinc-700 rounded-lg px-5 py-2.5 text-sm font-medium hover:border-zinc-400 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-5 border-t border-zinc-100">
        <p className="text-xs text-zinc-300">
          Powered by Claude · Delivered at 7:00 AM UTC
        </p>
      </footer>
    </main>
  )
}
