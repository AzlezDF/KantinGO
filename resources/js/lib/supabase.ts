import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Konfigurasi Supabase belum lengkap. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY.');
}

/**
 * Browser client. All user-data access is constrained by Supabase Row Level
 * Security; no secret or service-role key is ever bundled in this app.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});
