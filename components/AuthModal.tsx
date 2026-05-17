"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type AuthModalProps = {
  open: boolean;
  mode: "signin" | "signup";
  username: string;
  password: string;
  loading: boolean;
  error: string | null;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
};

export function AuthModal({
  open,
  mode,
  username,
  password,
  loading,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onClose,
}: AuthModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="absolute inset-0 bg-[#020408]/75 backdrop-blur-xl"
        onClick={onClose}
        aria-hidden
      />

      <form
        onSubmit={onSubmit}
        className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl border border-cyan-500/40 bg-[#0a0f1a]/95 p-8 shadow-[0_0_80px_rgba(34,211,238,0.2)] sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="auth-modal-title"
          className="text-2xl font-semibold text-cyan-100"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Use a username only (not your email). Example:{" "}
          <span className="font-mono text-cyan-300/90">jayden_w</span>
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="input-futuristic w-full py-3 text-base"
              placeholder="player_1"
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-400">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="input-futuristic w-full py-3 text-base"
              placeholder="••••••"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-600 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:bg-slate-800/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 py-3 text-base"
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
