import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "@/integrations/supabase/public-config";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Keep queued requests bound to their original account, including during logout. */
export function createSyncClient(accessToken: string) {
  return createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_KEY,
    {
      accessToken: async () => accessToken,
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
}
