import { createClient } from '@/lib/supabase/server'
import { Subscription } from '@/types'
import SubscriptionList from '@/components/dashboard/SubscriptionList'
import LanguageToggle from '@/components/dashboard/LanguageToggle'
import SendNowButton from '@/components/dashboard/SendNowButton'

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
      .select('language')
      .eq('id', user!.id)
      .single(),
  ])

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Your stocks</h1>
          <p className="text-sm text-muted mt-1">
            We&apos;ll send you a daily digest with what actually matters.
          </p>
        </div>
        <SendNowButton hasSubscriptions={(subscriptions?.length ?? 0) > 0} />
      </div>
      <SubscriptionList initialSubscriptions={(subscriptions as Subscription[]) ?? []} />
      <LanguageToggle initialLanguage={profile?.language ?? 'en'} />
    </main>
  )
}
