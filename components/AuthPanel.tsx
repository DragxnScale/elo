"use client";

import { useState } from "react";
import { signIn, signUp, signOut } from "@/app/actions";

type AuthPanelProps = {
  username: string | null;
  onAuthChange: () => void;
};

export function AuthPanel({ username, onAuthChange }: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (username) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">
          Signed in as{" "}
          <span className="font-mono text-cyan-300">@{username}</span>
        </span>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            onAuthChange();
          }}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
        >
          Sign out
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result =
      mode === "signin"
        ? await signIn(user, password)
        : await signUp(user, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUser("");
    setPassword("");
    onAuthChange();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-cyan-500/20 bg-slate-900/40 p-4"
    >
      <div>
        <label className="mb-1 block text-xs text-slate-500">Username</label>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="input-futuristic w-36"
          placeholder="player_1"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-futuristic w-36"
          placeholder="••••••"
          autoComplete={
            mode === "signin" ? "current-password" : "new-password"
          }
          required
          minLength={6}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="text-xs text-cyan-400/80 underline-offset-2 hover:underline"
      >
        {mode === "signin" ? "Create account" : "Have an account?"}
      </button>
      {error && (
        <p className="w-full text-xs text-red-400">{error}</p>
      )}
    </form>
  );
}
