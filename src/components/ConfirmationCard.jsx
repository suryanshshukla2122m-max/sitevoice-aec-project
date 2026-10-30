import React, { useEffect } from 'react';
import { Loader2, X, AlertTriangle, Calendar, User, MapPin } from 'lucide-react';

export function ConfirmationCard({
  pendingAction,
  projectName = 'Skyline Residence',
  projectCode = 'SKY-204',
  onConfirm,
  onCancel,
  isExecuting,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isExecuting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isExecuting]);

  if (!pendingAction || !pendingAction.payload) return null;

  const { actionType, payload } = pendingAction;
  const isSnag = actionType === 'CREATE_SNAG';

  const actionTitle = isSnag ? 'Confirm Problem Report' : 'Confirm Task Creation';
  const submitButtonLabel = isSnag ? 'Save Problem' : 'Save Task';

  const formattedDueDate = payload.dueDate
    ? new Date(payload.dueDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className="confirm-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExecuting) onCancel();
      }}
      role="presentation"
    >
      <div
        className="clean-confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="modal-header">
          <div>
            <h3 id="confirm-title" className="modal-header-title">
              Confirmation Window
            </h3>
            <p className="modal-subtitle">
              {actionTitle} • Review details before saving
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            disabled={isExecuting}
            aria-label="Close confirmation dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          <div className="confirm-item-badge">
            <span className={`badge-pill ${isSnag ? 'snag-pill' : 'task-pill'}`}>
              {isSnag ? 'PROBLEM REPORT' : 'SCHEDULED TASK'}
            </span>
            <span className="project-context-pill">{projectName} ({projectCode})</span>
          </div>

          <div className="confirm-item-title">{payload.title}</div>

          <div className="confirm-specs-list">
            {isSnag && payload.location && (
              <div className="confirm-spec-row">
                <span className="spec-name">
                  <MapPin size={13} />
                  <span>Location:</span>
                </span>
                <span className="spec-val">{payload.location}</span>
              </div>
            )}

            {isSnag && payload.priority && (
              <div className="confirm-spec-row">
                <span className="spec-name">
                  <AlertTriangle size={13} />
                  <span>Priority:</span>
                </span>
                <span className="spec-val highlight-priority">{payload.priority}</span>
              </div>
            )}

            {payload.assigneeName && (
              <div className="confirm-spec-row">
                <span className="spec-name">
                  <User size={13} />
                  <span>Assigned To:</span>
                </span>
                <span className="spec-val">{payload.assigneeName}</span>
              </div>
            )}

            {!isSnag && formattedDueDate && (
              <div className="confirm-spec-row">
                <span className="spec-name">
                  <Calendar size={13} />
                  <span>Deadline:</span>
                </span>
                <span className="spec-val highlight-date">{formattedDueDate}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-confirm-cancel"
            onClick={onCancel}
            disabled={isExecuting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-confirm-submit"
            onClick={onConfirm}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Saving changes…</span>
              </>
            ) : (
              submitButtonLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationCard;
