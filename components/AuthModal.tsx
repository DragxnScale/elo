"use client";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-[#0a0f1a] p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
      >
        <h2 className="text-lg font-semibold text-cyan-100">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Use a username only (not your email). Example:{" "}
          <span className="font-mono text-slate-400">jayden_w</span>
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Username</label>
            <input
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              className="input-futuristic w-full"
              placeholder="player_1"
              autoComplete="username"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="input-futuristic w-full"
              placeholder="••••••"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:border-slate-400"
          >
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
