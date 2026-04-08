import SignupForm from '@/components/auth/SignupForm'

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Glance.</h1>
          <p className="text-sm text-zinc-400 mt-1">Create your account</p>
        </div>
        <SignupForm />
      </div>
    </main>
  )
}
