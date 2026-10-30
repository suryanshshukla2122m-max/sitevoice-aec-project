import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  users = [],
  projectName = '',
  isSubmitting = false,
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [instructions, setInstructions] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');

  // Default due date to tomorrow formatted YYYY-MM-DD
  const getTomorrowString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDueDate(getTomorrowString());
      setPriority('Medium');
      setInstructions('');
      if (users.length > 0) {
        const defaultEngineer = users.find(u => u.role?.toLowerCase().includes('engineer') || u.role?.toLowerCase().includes('manager')) || users[0];
        setAssigneeId(defaultEngineer._id);
      }
      setDescription('');
      setValidationError('');
    }
  }, [isOpen, users]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Task title is required.');
      return;
    }
    if (!assigneeId) {
      setValidationError('Please select an assignee.');
      return;
    }

    setValidationError('');
    onSubmit({
      title: title.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      assigneeId,
      priority,
      instructions: instructions.trim(),
      description: description.trim(),
      status: 'Pending',
    });
  };

  return (
    <div
      className="modal-backdrop-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="presentation"
    >
      <div
        className="clean-standard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-task-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-task-title" className="modal-title">
              Create Task
            </h2>
            <p className="modal-subtitle">
              Assign work and set a deadline for {projectName || 'Skyline Residence'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-body">
          {validationError && (
            <div className="form-error-banner" role="alert">
              <AlertCircle size={15} />
              <span>{validationError}</span>
            </div>
          )}

          <div className="form-field-group">
            <label htmlFor="task-title" className="form-field-label">
              Task Name <span className="field-required">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              className="form-text-input"
              placeholder="e.g. Inspect electrical wiring before drywall closure"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              required
            />
          </div>

          <div className="form-grid-two-col">
            <div className="form-field-group">
              <label htmlFor="task-priority" className="form-field-label">
                Priority
              </label>
              <select
                id="task-priority"
                className="form-select-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Critical">Critical (Immediate)</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="task-due-date" className="form-field-label">
                Deadline
              </label>
              <input
                id="task-due-date"
                type="date"
                className="form-text-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label htmlFor="task-assignee" className="form-field-label">
              Assigned To <span className="field-required">*</span>
            </label>
            <select
              id="task-assignee"
              className="form-select-input"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              disabled={isSubmitting}
              required
            >
              <option value="">Select person or contractor…</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field-group">
            <label htmlFor="task-description" className="form-field-label">
              Work Details
            </label>
            <textarea
              id="task-description"
              className="form-textarea-input"
              rows={2}
              placeholder="Summary of work to be performed…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="task-instructions" className="form-field-label">
              Field Instructions / Specifications
            </label>
            <textarea
              id="task-instructions"
              className="form-textarea-input"
              rows={2}
              placeholder="e.g. Laser tolerance ±2mm, check 5-bar hydrostatic pressure holding for 4 hours…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-footer-actions">
            <button
              type="button"
              className="btn-modal-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving Task…</span>
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;
