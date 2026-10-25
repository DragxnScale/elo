"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";

export type AuthFieldErrors = {
  username?: string;
  password?: string;
};

type AuthModalProps = {
  open: boolean;
  mode: "signin" | "signup";
  username: string;
  password: string;
  loading: boolean;
  formError: string | null;
  fieldErrors: AuthFieldErrors;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onSwitchMode: () => void;
};

const subscribeNothing = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function AuthModal({
  open,
  mode,
  username,
  password,
  loading,
  formError,
  fieldErrors,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  onClose,
  onSwitchMode,
}: AuthModalProps) {
  // True on the client after hydration, false on the server: lets us portal
  // to document.body without setting state in an effect.
  const mounted = useSyncExternalStore(
    subscribeNothing,
    clientSnapshot,
    serverSnapshot,
  );
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pressedInside = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // A revealed password never carries over to the next time the dialog opens.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setShowPassword(false);
  }

  // Dialog closes on any click that lands on the backdrop, including the
  // click that ends a text-selection drag begun inside a field. Remember where
  // each press started and ignore that one close. Any key press clears the
  // flag, so Esc always closes.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const dialog = bodyRef.current?.closest("dialog");
      const target = e.target as Node | null;
      pressedInside.current = Boolean(
        dialog && target && target !== dialog && dialog.contains(target),
      );
    };
    const onKeyDown = () => {
      pressedInside.current = false;
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  function handleBackdropOrEsc() {
    if (pressedInside.current) {
      pressedInside.current = false;
      return;
    }
    onClose();
  }

  // Dialog renders its children while closed, so autoFocus would hit a hidden
  // element. Focus Username once the dialog is open (Dialog's own effect runs
  // first and calls showModal).
  useEffect(() => {
    if (open) usernameRef.current?.focus();
  }, [open]);

  // A new fieldErrors object arrives on every failed submit, so focus returns
  // to the offending field even when the message text is unchanged.
  useEffect(() => {
    if (fieldErrors.username) usernameRef.current?.focus();
    else if (fieldErrors.password) passwordRef.current?.focus();
  }, [fieldErrors]);

  if (!mounted) return null;

  const signingIn = mode === "signin";
  const title = signingIn ? "Sign in" : "Create account";

  return createPortal(
    <Dialog
      open={open}
      onClose={handleBackdropOrEsc}
      size="sm"
      onSubmit={onSubmit}
      title={title}
      description={
        signingIn ? (
          <>
            No account yet?{" "}
            <Button
              variant="link"
              className="-my-1 py-1"
              onClick={onSwitchMode}
              disabled={loading}
            >
              Create one
            </Button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Button
              variant="link"
              className="-my-1 py-1"
              onClick={onSwitchMode}
              disabled={loading}
            >
              Sign in
            </Button>
          </>
        )
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Please wait…" : title}
          </Button>
        </>
      }
    >
      <div ref={bodyRef} className="space-y-4">
        <Field
          label="Username"
          hint="Use a username, not an email. Example: jayden_w"
          error={fieldErrors.username}
        >
          <Input
            ref={usernameRef}
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            aria-required="true"
            onKeyDown={(e) => {
              // "Next" should move to Password, not submit a half-empty form.
              if (
                e.key === "Enter" &&
                !password &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                passwordRef.current?.focus();
              }
            }}
          />
        </Field>
        <Field
          label="Password"
          hint={signingIn ? undefined : "At least 6 characters."}
          error={fieldErrors.password}
        >
          {(control) => (
            <div className="relative">
              <Input
                {...control}
                ref={passwordRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                autoComplete={signingIn ? "current-password" : "new-password"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-required="true"
                className="pr-11"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                aria-label="Show password"
                aria-pressed={showPassword}
                // Keep focus (and the phone keyboard) in the field.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </Button>
            </div>
          )}
        </Field>
        {formError && <Notice tone="error">{formError}</Notice>}
      </div>
    </Dialog>,
    document.body,
  );
}
