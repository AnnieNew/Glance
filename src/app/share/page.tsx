'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ShareCard() {
  const params = useSearchParams()
  const token = params.get('token')
  const lang = params.get('lang') ?? 'en'
  const zh = lang === 'zh'

  if (!token) {
    return (
      <p className="text-sm text-muted">{zh ? '链接已失效。' : 'This link has expired.'}</p>
    )
  }

  const cardUrl = `/api/digest/card?token=${token}`

  async function copyLink(targetLang: string) {
    const url = `${window.location.origin}/share?token=${token}&lang=${targetLang}`
    try {
      await navigator.clipboard.writeText(url)
      alert(targetLang === 'zh' ? '中文链接已复制' : 'English link copied')
    } catch {
      alert(url)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <img
        src={cardUrl}
        alt={zh ? '今日亮点' : "Today's highlights"}
        className="w-full max-w-2xl rounded-xl border border-border shadow-sm"
      />
      <div className="flex gap-3 flex-wrap justify-center">
        <a
          href={cardUrl}
          download="glance-highlights.png"
          className="border border-border text-foreground rounded-lg px-4 py-2 text-sm hover:border-border-strong transition-colors"
        >
          {zh ? '保存图片' : 'Save image'}
        </a>
        <button
          onClick={() => copyLink('en')}
          className="border border-border text-foreground rounded-lg px-4 py-2 text-sm hover:border-border-strong transition-colors"
        >
          Share in English
        </button>
        <button
          onClick={() => copyLink('zh')}
          className="bg-foreground text-background rounded-lg px-4 py-2 text-sm hover:opacity-80 transition-opacity"
        >
          分享中文版
        </button>
      </div>
    </div>
  )
}

export default function SharePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <SharePageContent />
      </Suspense>
    </main>
  )
}

function SharePageContent() {
  const params = useSearchParams()
  const lang = params.get('lang') ?? 'en'
  const zh = lang === 'zh'

  return (
    <>
      <div className="mb-8">
        <h1 className="text-xl font-semibold">{zh ? '今日亮点' : "Today's highlights"}</h1>
        <p className="text-sm text-muted mt-1">
          {zh ? '将今日行情摘要分享给朋友。' : 'Share your market digest with friends.'}
        </p>
      </div>
      <ShareCard />
    </>
  )
}
