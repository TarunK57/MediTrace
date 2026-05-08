import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    lock: async (name, acquireTimeout, fn) => fn(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
export default supabase;