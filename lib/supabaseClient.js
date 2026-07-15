import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ini cuma warning di console, biar gampang ketauan kalau env var lupa diisi.
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum di-set. " +
      "Cek file .env.local atau Environment Variables di Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
