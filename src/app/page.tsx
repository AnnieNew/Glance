import Link from 'next/link'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const zh = lang === 'zh'
  const lp = zh ? '?lang=zh' : ''

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Nav */}
      <nav className="px-6 py-5">
        <span className="font-serif italic text-xl wordmark">Glance.</span>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 pb-24 max-w-lg">
        <h1 className="font-serif italic text-5xl tracking-tight leading-tight mb-4">
          {zh ? (
            <>您的股票。<br />一个信号。<br />每天早晨。</>
          ) : (
            <>Your stocks.<br />One signal.<br />Every morning.</>
          )}
        </h1>
        <p className="text-muted text-base leading-relaxed mb-8 max-w-sm">
          {zh
            ? 'Glance 为您过滤市场噪音——每天 15 秒，只推送真正影响判断的信息。'
            : 'Glance cuts through financial noise — sending you a daily 15-second read with only the news that actually shifts your thinking.'}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={`/login${lp}`}
            className="bg-foreground text-background rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            {zh ? '登录 / 注册' : 'Sign in / Sign up'}
          </Link>
          <Link
            href={`/guest${lp}`}
            className="border border-border text-muted rounded-lg px-5 py-2.5 text-sm font-medium hover:border-border-strong hover:text-foreground transition-colors"
          >
            {zh ? '访客模式' : 'Continue as Guest'}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-5 border-t border-border space-y-1">
        <p className="text-xs text-muted-subtle">
          {zh ? '每个工作日早上 6:00 PDT 发送' : 'Delivered at 6:00 AM PDT'}
        </p>
        <p className="text-xs text-muted-subtle">
          {zh ? '仅供参考，不构成投资建议。' : 'For informational purposes only. Not investment advice.'}
        </p>
      </footer>
    </main>
  )
}
