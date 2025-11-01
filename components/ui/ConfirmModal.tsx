"use client";

import { useState, type ReactNode } from "react";

type ConfirmModalProps = {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  // Render prop that receives an "open" function to show the modal
  trigger: (open: () => void) => ReactNode;
  disabled?: boolean;
};

export default function ConfirmModal({
  title = "Please confirm",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  trigger,
  disabled = false,
}: ConfirmModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  const handleConfirm = async () => {
    try {
      setIsBusy(true);
      await onConfirm();
      close();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      {trigger(open)}

      {isOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-neutral-200 p-5">
              <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
            </div>

            <div className="p-5">
              <p className="text-neutral-700">{message}</p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 p-5">
              <button
                type="button"
                onClick={() => {
                  onCancel?.();
                  close();
                }}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                disabled={isBusy}
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={isBusy}
              >
                {isBusy ? "Working..." : confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
