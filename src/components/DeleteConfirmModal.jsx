import React, { useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '',
  itemType = 'item',
  isDeleting = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
      role="presentation"
    >
      <div
        className="clean-standard-modal delete-modal-variant"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div className="modal-header">
          <div className="delete-icon-badge">
            <AlertTriangle size={18} />
          </div>
          <div className="delete-header-text">
            <h2 id="delete-dialog-title" className="modal-title">
              Delete {itemType}
            </h2>
            <p className="modal-subtitle">This action will permanently delete this record.</p>
          </div>
          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body-content">
          <p className="delete-warning-text">
            Are you sure you want to delete <strong>"{title}"</strong>?
          </p>
        </div>

        <div className="modal-footer-actions">
          <button
            type="button"
            className="btn-modal-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Deleting…</span>
              </>
            ) : (
              `Delete ${itemType}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
