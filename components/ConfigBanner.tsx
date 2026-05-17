"use client";

import { getSupabaseEnv } from "@/lib/env";

export function ConfigBanner() {
  const { isConfigured } = getSupabaseEnv();

  if (isConfigured) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
      Supabase is not configured. Add{" "}
      <code className="font-mono text-amber-200">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
      and{" "}
      <code className="font-mono text-amber-200">
        NEXT_PUBLIC_SUPABASE_ANON_KEY
      </code>{" "}
      in Vercel → Project → Settings → Environment Variables, then redeploy.
    </div>
  );
}
