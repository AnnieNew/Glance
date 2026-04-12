'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ShareCard() {
  const params = useSearchParams()
  const token = params.get('token')

  if (!token) {
    return (
      <p className="text-sm text-muted">This link has expired.</p>
    )
  }

  const cardUrl = `/api/digest/card?token=${token}`

  async function handleShare() {
    try {
      const res = await fetch(cardUrl)
      const blob = await res.blob()
      const file = new File([blob], 'glance-highlights.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Today's highlights from Glance" })
        return
      }
    } catch { /* fall through to copy */ }
    await navigator.clipboard.writeText(`${window.location.origin}${cardUrl}`)
    alert('Link copied to clipboard')
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <img
        src={cardUrl}
        alt="Today's highlights"
        className="w-full max-w-2xl rounded-xl border border-border shadow-sm"
      />
      <div className="flex gap-3">
        <a
          href={cardUrl}
          download="glance-highlights.png"
          className="border border-border text-foreground rounded-lg px-4 py-2 text-sm hover:border-border-strong transition-colors"
        >
          Save image
        </a>
        <button
          onClick={handleShare}
          className="bg-foreground text-background rounded-lg px-4 py-2 text-sm hover:opacity-80 transition-opacity"
        >
          Share
        </button>
      </div>
    </div>
  )
}

export default function SharePage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Today&apos;s highlights</h1>
        <p className="text-sm text-muted mt-1">Share your market digest with friends.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <ShareCard />
      </Suspense>
    </main>
  )
}
