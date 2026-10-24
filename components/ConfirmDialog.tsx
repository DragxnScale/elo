"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** Disables Cancel, shows the confirm button as busy and ignores Esc/backdrop. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Destructive confirmation on the native <dialog>. Always rendered (never
 * `null` when closed) so the exit animation plays and focus returns to the
 * trigger. Cancel comes first in the DOM so initial focus lands on the safe
 * choice.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onCancel();
      }}
      title={title}
      description={message}
      footer={
        <>
          <Button variant="secondary" disabled={loading} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
