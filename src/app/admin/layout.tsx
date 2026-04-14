import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.email !== process.env.ADMIN_EMAIL) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-semibold tracking-tight">Glance. <span className="text-muted font-normal text-sm">admin</span></span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="text-sm text-muted hover:text-foreground transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  )
}
