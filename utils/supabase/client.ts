"use client";

import { createClient } from "@supabase/supabase-js";

// Create a single shared client for client components
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
  }
);
