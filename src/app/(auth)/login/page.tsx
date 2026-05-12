import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="font-serif italic text-3xl wordmark">Glance.</h1>
          <p className="text-sm text-zinc-400 mt-1">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
