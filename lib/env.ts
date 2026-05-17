export function getSupabaseEnv() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  let url = "";
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      url = `${parsed.protocol}//${parsed.host}`;
    } catch {
      url = "";
    }
  }

  const isConfigured =
    Boolean(url && anonKey) &&
    url.includes("supabase.co") &&
    !url.includes("vercel.app");

  return { url, anonKey, isConfigured, rawUrl };
}

export function getSupabaseConfigError(): string | null {
  const { url, anonKey, isConfigured, rawUrl } = getSupabaseEnv();

  if (!rawUrl || !anonKey) {
    return "Supabase environment variables are missing.";
  }
  if (rawUrl.includes("vercel.app")) {
    return "NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL (https://xxx.supabase.co), not your Vercel site URL.";
  }
  if (!url.includes("supabase.co")) {
    return "NEXT_PUBLIC_SUPABASE_URL must look like https://your-project.supabase.co";
  }
  if (!isConfigured) return "Supabase is not configured correctly.";
  return null;
}

export function getSiteUrl(request?: Request): string {
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }
    return new URL(request.url).origin;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
