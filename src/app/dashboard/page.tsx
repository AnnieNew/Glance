import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Subscription } from '@/types'
import SubscriptionList from '@/components/dashboard/SubscriptionList'
import LanguageToggle from '@/components/dashboard/LanguageToggle'
import SendNowButton from '@/components/dashboard/SendNowButton'
import PauseButton from '@/components/dashboard/PauseButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: subscriptions }, { data: profile }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('language, paused, nickname')
      .eq('id', user!.id)
      .single(),
  ])

  if (!profile?.nickname) redirect('/onboarding')

  const language = profile?.language ?? 'en'
  const paused = profile?.paused ?? false
  const zh = language === 'zh'

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{zh ? '我的股票' : 'Your stocks'}</h1>
          <p className="text-sm text-muted mt-1">
            {zh ? '每个工作日为您推送精选行情摘要。' : "We'll send you a daily digest with what actually matters."}
          </p>
        </div>
        <SendNowButton hasSubscriptions={(subscriptions?.length ?? 0) > 0} language={language} />
      </div>
      <SubscriptionList initialSubscriptions={(subscriptions as Subscription[]) ?? []} language={language} />
      <LanguageToggle initialLanguage={language} />
      <PauseButton initialPaused={paused} language={language} />
    </main>
  )
}
