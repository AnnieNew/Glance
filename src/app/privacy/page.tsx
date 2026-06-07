import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Glance',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-12 max-w-2xl mx-auto">
      <nav className="mb-10">
        <Link href="/" className="font-serif italic text-xl wordmark">Glance.</Link>
      </nav>

      <h1 className="text-2xl font-serif italic mb-1">Privacy Policy</h1>
      <p className="text-xs text-muted mb-8">Last updated: June 5, 2025</p>

      <div className="space-y-8 text-sm leading-relaxed text-foreground">

        <section>
          <h2 className="font-medium mb-2">1. What We Collect</h2>
          <p className="text-muted mb-2">We collect only what we need to deliver the Service:</p>
          <ul className="text-muted list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Email address</strong> — to authenticate you and deliver your daily Digest</li>
            <li><strong className="text-foreground">Portfolio tickers</strong> — the stocks you add to personalize your Digest</li>
            <li><strong className="text-foreground">Usage data</strong> — pages visited, features used, to improve the Service (no cross-site tracking)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-medium mb-2">2. How We Use Your Data</h2>
          <ul className="text-muted list-disc list-inside space-y-1">
            <li>To generate and deliver your personalized daily Digest email</li>
            <li>To authenticate you and maintain your account</li>
            <li>To improve the Service based on aggregate, anonymized usage patterns</li>
            <li>To contact you about important Service updates (not marketing, unless you opt in)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-medium mb-2">3. Data Sharing</h2>
          <p className="text-muted mb-2">
            We do not sell, rent, or trade your personal data. We use the following sub-processors to operate the Service:
          </p>
          <ul className="text-muted list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Supabase</strong> — database and authentication</li>
            <li><strong className="text-foreground">Resend</strong> — transactional email delivery</li>
            <li><strong className="text-foreground">Vercel</strong> — hosting and infrastructure</li>
          </ul>
          <p className="text-muted mt-2">
            Each sub-processor is contractually bound to handle your data only as needed to provide their service.
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">4. Data Retention</h2>
          <p className="text-muted">
            We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">5. Your Rights</h2>
          <p className="text-muted mb-2">You have the right to:</p>
          <ul className="text-muted list-disc list-inside space-y-1">
            <li>Access a copy of the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Delete your account and associated data</li>
            <li>Unsubscribe from Digest emails at any time via the unsubscribe link in any email</li>
          </ul>
          <p className="text-muted mt-2">
            To exercise these rights, email{' '}
            <a href="mailto:support@glance.so" className="text-foreground underline underline-offset-2">support@glance.so</a>.
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">6. Cookies &amp; Local Storage</h2>
          <p className="text-muted">
            We use cookies only for authentication (session management). We do not use advertising or tracking cookies. You can disable cookies in your browser, but this will prevent you from staying signed in.
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">7. Security</h2>
          <p className="text-muted">
            We use industry-standard security practices including encrypted connections (HTTPS), hashed authentication tokens, and access controls. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">8. Children</h2>
          <p className="text-muted">
            Glance is not intended for users under 18. We do not knowingly collect data from minors. If you believe a minor has registered, contact us and we will delete the account.
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">9. Changes to This Policy</h2>
          <p className="text-muted">
            We may update this Privacy Policy. We will notify registered users of material changes by email. Continued use of the Service after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">10. Contact</h2>
          <p className="text-muted">
            Questions about this policy? Email us at{' '}
            <a href="mailto:support@glance.so" className="text-foreground underline underline-offset-2">support@glance.so</a>.
          </p>
        </section>

      </div>

      <div className="mt-12 pt-6 border-t border-border flex gap-4 text-xs text-muted">
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        <Link href="/" className="hover:text-foreground transition-colors">Back to Glance</Link>
      </div>
    </main>
  )
}
