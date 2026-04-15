import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('language')
    .eq('id', user.id)
    .single()

  const zh = profile?.language === 'zh'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-semibold tracking-tight">Glance.</span>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            {zh ? '退出登录' : 'Sign out'}
          </button>
        </form>
      </header>
      {children}
    </div>
  )
}
