
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const STORAGE_KEY = `canchalibre-auth:v1:${process.env.ENVIROMENT}` || 'produccion';
const SUPABASE_URL = "https://zjtfkedgyvkonrcnofae.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqdGZrZWRneXZrb25yY25vZmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNzQ3OTgsImV4cCI6MjA3MTY1MDc5OH0.A6QyhjNsYYnX8jBSfxRh7wUxmYPtN_nyEgNFSeTvVlg";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: window.localStorage,
    storageKey: STORAGE_KEY,
  },
});
