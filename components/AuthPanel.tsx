"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  normalizeUsername,
  isValidUsername,
  usernameToEmail,
} from "@/lib/auth";
import { getSupabaseConfigError } from "@/lib/env";
import { AuthModal, type AuthFieldErrors } from "@/components/AuthModal";
import { friendlyAuthError } from "@/components/shell/auth-errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLink } from "@/components/ui/link";
import { signOut } from "@/app/actions";

type AuthMode = "signin" | "signup";

type AuthPanelProps = {
  username: string | null;
  /** Called after sign in, sign up or sign out. May return a promise; sign out waits for it. */
  onAuthChange: () => void | Promise<void>;
  /** True while the first session check is in flight (signed-in state unknown). */
  loading?: boolean;
};

const NETWORK_ERROR =
  "Couldn't reach the server. Check your connection and try again.";

/**
 * Renders its controls as direct children (no wrapper) so the header's flex
 * row can wrap and place them next to the theme toggle.
 */
export function AuthPanel({
  username,
  onAuthChange,
  loading: authLoading = false,
}: AuthPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  // Spoken, not shown: the header swaps controls silently otherwise.
  const [status, setStatus] = useState("");
  const identityRef = useRef<HTMLAnchorElement>(null);
  const signInRef = useRef<HTMLButtonElement>(null);
  // The control that was focused unmounts when the account state flips, so
  // focus is handed to its counterpart once the new controls exist.
  const focusAfterChange = useRef<"identity" | "signin" | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (username && focusAfterChange.current === "identity") {
      identityRef.current?.focus();
      focusAfterChange.current = null;
    } else if (!username && focusAfterChange.current === "signin") {
      signInRef.current?.focus();
      focusAfterChange.current = null;
    }
  }, [username, authLoading]);

  function clearErrors() {
    setFieldErrors({});
    setFormError(null);
  }

  function openModal(next: AuthMode) {
    clearErrors();
    setMode(next);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    clearErrors();
    setPassword("");
  }

  function switchMode() {
    clearErrors();
    setMode((current) => (current === "signin" ? "signup" : "signin"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    clearErrors();

    try {
      const configError = getSupabaseConfigError();
      if (configError) {
        setFormError(`${configError} See the notice at the top of the page.`);
        return;
      }

      const normalized = normalizeUsername(user);
      if (!isValidUsername(normalized)) {
        setFieldErrors({
          username:
            "Username must be 3–20 letters, numbers or underscores. No email.",
        });
        return;
      }
      if (password.length < 6) {
        setFieldErrors({
          password: "Password must be at least 6 characters.",
        });
        return;
      }

      const supabase = createClient();
      const email = usernameToEmail(normalized);

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setFormError(friendlyAuthError(signInError.message, mode));
          return;
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: normalized } },
        });
        if (signUpError) {
          setFormError(friendlyAuthError(signUpError.message, mode));
          return;
        }
        if (!data.user) {
          setFormError("Couldn't create the account. Try again.");
          return;
        }

        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username: normalized,
        });

        if (profileError && profileError.code !== "23505") {
          setFormError(`Couldn't save your profile: ${profileError.message}`);
          return;
        }
      }

      setUser("");
      setPassword("");
      closeModal();
      focusAfterChange.current = "identity";
      setStatus(
        mode === "signin"
          ? "Signed in."
          : "Account created. You are signed in.",
      );
      void onAuthChange();
      router.refresh();
    } catch {
      setFormError(NETWORK_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await signOut();
      focusAfterChange.current = "signin";
      setStatus("Signed out.");
      // Wait, so the button does not flip back to "Sign out" while the
      // header is still catching up.
      await onAuthChange();
      router.refresh();
    } catch {
      focusAfterChange.current = null;
      setSignOutError(
        "Couldn't sign out. Check your connection and try again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  let body: React.ReactNode;

  if (authLoading) {
    body = <Skeleton className="h-10 w-48" />;
  } else if (username) {
    body = (
      <>
        <TextLink
          ref={identityRef}
          href={`/u/${username}`}
          variant="plain"
          className="inline-flex min-h-10 min-w-0 items-center gap-2 text-sm"
        >
          <span className="truncate font-medium">@{username}</span>
          <span className="shrink-0 text-muted-foreground">My stats</span>
        </TextLink>
        <Button variant="ghost" onClick={handleSignOut} loading={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
        {signOutError && (
          <p role="alert" className="text-sm text-loss">
            {signOutError}
          </p>
        )}
      </>
    );
  } else {
    body = (
      <>
        <Button
          ref={signInRef}
          variant="secondary"
          onClick={() => openModal("signin")}
        >
          Sign in
        </Button>
        <Button variant="primary" onClick={() => openModal("signup")}>
          Create account
        </Button>

        <AuthModal
          open={open}
          mode={mode}
          username={user}
          password={password}
          loading={submitting}
          formError={formError}
          fieldErrors={fieldErrors}
          onUsernameChange={setUser}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
          onClose={closeModal}
          onSwitchMode={switchMode}
        />
      </>
    );
  }

  return (
    <>
      <span role="status" className="sr-only">
        {status}
      </span>
      {body}
    </>
  );
}
