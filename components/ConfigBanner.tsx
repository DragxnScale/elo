"use client";

import { getSupabaseConfigError } from "@/lib/env";

export function ConfigBanner() {
  const message = getSupabaseConfigError();

  if (!message) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100">
      {message} Set{" "}
      <code className="font-mono text-amber-200">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
      to <code className="font-mono text-amber-200">https://xxx.supabase.co</code>{" "}
      and your publishable key in Vercel env vars, then redeploy.
    </div>
  );
}
