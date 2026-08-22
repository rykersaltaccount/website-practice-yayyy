import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  title,
  message,
  confirmLabel = 'Confirm delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="w-full max-w-sm rounded-xl border border-white/[0.12] bg-[#0e1015] p-5 text-white shadow-2xl"
    >
      <h2 id="confirm-dialog-title" className="text-base font-semibold">{title}</h2>
      <div className="mt-2 text-sm text-[#a6aab3]">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-white/[0.12] px-3 py-2 text-xs text-[#a6aab3] hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="rounded-md bg-[#f43f5e] px-3 py-2 text-xs font-semibold text-white hover:bg-[#e11d48]">
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
