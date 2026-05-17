"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0a0f1a]/95 p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
        <h3 className="text-lg font-semibold text-cyan-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 ring-1 ring-red-500/50 transition hover:bg-red-500/30"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
