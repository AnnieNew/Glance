import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold tracking-tight">Glance.</span>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  )
}
