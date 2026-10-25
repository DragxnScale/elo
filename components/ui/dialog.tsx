"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" } as const;

export type DialogProps = {
  open: boolean;
  /** Called on Esc, backdrop click, or a Cancel you wire up. Parent owns `open`. */
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons, right-aligned. Put the primary action last. */
  footer?: React.ReactNode;
  size?: keyof typeof widths;
  /** Wrap the body in a <form> (e.g. sign in) by passing its handler. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  children?: React.ReactNode;
  className?: string;
};

/**
 * A modal on the native <dialog> element: focus is trapped, the page behind is
 * inert, Esc closes, focus returns to the trigger. Enter/exit animation lives
 * in globals.css (.ui-dialog). Use only when a task needs interruption
 * (auth, destructive confirm); prefer inline UI otherwise.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  onSubmit,
  children,
  className,
}: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const uid = React.useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  React.useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const content = (
    <>
      <h2 id={titleId} className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      {description && (
        <p id={descId} className="mt-1.5 text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
      {footer && (
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        // Let the parent own `open`; it will close the dialog via the effect.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop targets the <dialog> itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "ui-dialog m-auto w-[calc(100%-2rem)] rounded-xl border border-border bg-card p-0 text-foreground shadow-overlay",
        widths[size],
        className
      )}
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} className="p-6">
          {content}
        </form>
      ) : (
        <div className="p-6">{content}</div>
      )}
    </dialog>
  );
}
