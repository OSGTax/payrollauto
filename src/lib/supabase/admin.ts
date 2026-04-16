import { createClient } from '@supabase/supabase-js';

/**
 * Server-only client using the service role key. Bypasses RLS.
 * Only import inside server actions / route handlers behind an admin check.
 */
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
