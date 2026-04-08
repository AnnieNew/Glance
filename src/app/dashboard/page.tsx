import { createClient } from '@/lib/supabase/server'
import { Subscription } from '@/types'
import SubscriptionList from '@/components/dashboard/SubscriptionList'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Your stocks</h1>
        <p className="text-sm text-zinc-400 mt-1">
          We&apos;ll send you a daily digest with what actually matters.
        </p>
      </div>
      <SubscriptionList initialSubscriptions={(data as Subscription[]) ?? []} />
    </main>
  )
}
