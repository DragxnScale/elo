"use client";

import { getSupabaseConfigError } from "@/lib/env";
import { Container } from "@/components/ui/container";
import { Notice } from "@/components/ui/notice";

const code = "font-mono text-[0.8125rem] break-all";

export function ConfigBanner() {
  const message = getSupabaseConfigError();

  if (!message) return null;

  return (
    <div className="border-b border-border bg-warn-subtle">
      <Container>
        <Notice
          tone="warning"
          title={message}
          className="break-words rounded-none bg-transparent px-0 py-3"
        >
          Set <code className={code}>NEXT_PUBLIC_SUPABASE_URL</code> to your
          Supabase project URL (
          <code className={code}>https://xxx.supabase.co</code>) and{" "}
          <code className={code}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (or{" "}
          <code className={code}>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>) to
          your publishable key, in <code className={code}>.env.local</code>{" "}
          locally or in your Vercel environment variables. Then restart the dev
          server or redeploy.
        </Notice>
      </Container>
    </div>
  );
}
