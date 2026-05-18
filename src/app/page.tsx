import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="px-6 py-5">
        <span className="font-serif italic text-xl wordmark">Glance.</span>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 pb-24 max-w-lg">
        <h1 className="font-serif italic text-5xl tracking-tight leading-tight mb-4">
          Your stocks.<br />One signal.<br />Every morning.
        </h1>
        <p className="text-muted text-base leading-relaxed mb-8 max-w-sm">
          Glance cuts through financial noise — sending you a daily 15-second read with only the news that actually shifts your thinking.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="bg-foreground text-background rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Sign in / Sign up
          </Link>
          <Link
            href="/guest"
            className="border border-border text-muted rounded-lg px-5 py-2.5 text-sm font-medium hover:border-border-strong hover:text-foreground transition-colors"
          >
            Continue as Guest
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-5 border-t border-border">
        <p className="text-xs text-muted-subtle">
          Delivered at 6:00 AM PDT
        </p>
      </footer>
    </main>
  )
}
