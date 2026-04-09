'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

interface Props {
  initialLanguage: string
}

export default function LanguageToggle({ initialLanguage }: Props) {
  const [saved, setSaved] = useState(initialLanguage)
  const [pending, setPending] = useState(initialLanguage)
  const [saving, setSaving] = useState(false)

  const isDirty = pending !== saved

  async function handleSave() {
    if (!isDirty || saving) return
    setSaving(true)
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: pending }),
    })
    setSaved(pending)
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
      <span className="text-sm text-zinc-400">Email language</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          variant={pending === 'en' ? 'primary' : 'ghost'}
          onClick={() => setPending('en')}
        >
          EN
        </Button>
        <Button
          variant={pending === 'zh' ? 'primary' : 'ghost'}
          onClick={() => setPending('zh')}
        >
          中文
        </Button>
      </div>
      {isDirty && (
        <Button variant="ghost" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      )}
    </div>
  )
}
