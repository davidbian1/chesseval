interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="promotion-backdrop" onClick={onCancel}>
      <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-ok" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
