"use client";

import { useEffect, useId, useRef } from "react";

const TONES = {
  danger: {
    iconWrap: "bg-rose-500/15 border border-rose-500/30 text-rose-400",
    confirmBtn: "bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-400/50",
    iconPath:
      "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  },
  warning: {
    iconWrap: "bg-amber-500/15 border border-amber-500/30 text-amber-400",
    confirmBtn: "bg-amber-600 hover:bg-amber-500 focus-visible:ring-amber-400/50",
    iconPath:
      "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  },
};

/**
 * ConfirmDialog — themed, accessible replacement for window.confirm().
 *
 * Renders nothing while closed. When open, it focuses Cancel (the safe
 * action), traps Tab inside the dialog, closes on Escape/backdrop click
 * (unless a request is pending), and restores focus to the trigger element.
 */
export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pendingLabel = "Deleting...",
  pending = false,
  error = "",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const restoreFocusRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  const pendingRef = useRef(pending);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => cancelRef.current?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!pendingRef.current) {
          event.preventDefault();
          onCancelRef.current?.();
        }
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const scheme = TONES[tone] || TONES.danger;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-overlay-in"
        onClick={() => {
          if (!pending) onCancel?.();
        }}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative w-full max-w-md confirm-dialog-panel rounded-2xl border border-white/[0.1] p-6 sm:p-7 animate-dialog-in"
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${scheme.iconWrap}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={scheme.iconPath} />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-white">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="btn-secondary px-4 py-2.5 text-xs font-semibold rounded-xl disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`px-4 py-2.5 text-xs font-semibold rounded-xl text-white transition-all focus:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:cursor-not-allowed ${scheme.confirmBtn}`}
          >
            {pending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {pendingLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
