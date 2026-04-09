import { createClient } from '@supabase/supabase-js'

// Uses service role key — bypasses RLS. Never expose to the client.
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
