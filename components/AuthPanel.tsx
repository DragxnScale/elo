"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeUsername,
  isValidUsername,
  usernameToEmail,
} from "@/lib/auth";
import { getSupabaseConfigError } from "@/lib/env";
import { AuthModal } from "@/components/AuthModal";
import { signOut } from "@/app/actions";

type AuthPanelProps = {
  username: string | null;
  onAuthChange: () => void;
  onCreateMatch?: () => void;
  canCreateMatch?: boolean;
};

export function AuthPanel({
  username,
  onAuthChange,
  onCreateMatch,
  canCreateMatch = false,
}: AuthPanelProps) {
  const router = useRouter();
  const [modal, setModal] = useState<"signin" | "signup" | null>(null);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openModal(mode: "signin" | "signup") {
    setError(null);
    setModal(mode);
  }

  function closeModal() {
    setModal(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    const normalized = normalizeUsername(user);
    if (!isValidUsername(normalized)) {
      setError(
        "Username must be 3–20 characters: letters, numbers, underscore only (no email)."
      );
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const email = usernameToEmail(normalized);

    if (modal === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    } else {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: normalized } },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      if (!data.user) {
        setError("Sign up failed. Try again.");
        setLoading(false);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username: normalized,
      });

      if (profileError && profileError.code !== "23505") {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    setUser("");
    setPassword("");
    setLoading(false);
    closeModal();
    onAuthChange();
    router.refresh();
  }

  if (username) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="hidden text-sm text-slate-400 sm:inline">
          <span className="font-mono text-cyan-300">@{username}</span>
        </span>
        {canCreateMatch && onCreateMatch && (
          <button type="button" onClick={onCreateMatch} className="btn-secondary">
            Create match
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            await signOut();
            onAuthChange();
            router.refresh();
          }}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => openModal("signin")}
          className="rounded-lg border border-cyan-500/40 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/10"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => openModal("signup")}
          className="btn-primary"
        >
          Create account
        </button>
      </div>

      <AuthModal
        open={modal !== null}
        mode={modal ?? "signin"}
        username={user}
        password={password}
        loading={loading}
        error={error}
        onUsernameChange={setUser}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </>
  );
}
