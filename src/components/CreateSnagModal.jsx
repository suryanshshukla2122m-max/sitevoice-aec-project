import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

export function CreateSnagModal({
  isOpen,
  onClose,
  onSubmit,
  users = [],
  projectName = '',
  initialData = null,
  isSubmitting = false,
}) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setLocation(initialData?.location || '');
      setPriority(initialData?.priority || 'Medium');
      // Set contractor
      if (initialData?.assigneeId) {
        setAssigneeId(initialData.assigneeId);
      } else if (users.length > 0) {
        const defaultContractor = users.find(u => u.role?.toLowerCase().includes('contractor')) || users[0];
        setAssigneeId(defaultContractor._id);
      }
      setDescription(initialData?.description || '');
      setValidationError('');
    }
  }, [isOpen, users, initialData]);

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
      setValidationError('Problem title is required.');
      return;
    }
    if (!location.trim()) {
      setValidationError('Location is required (e.g. Master bedroom, 2nd Floor Corridor).');
      return;
    }
    if (!assigneeId) {
      setValidationError('Please select a contractor.');
      return;
    }

    setValidationError('');
    onSubmit({
      title: title.trim(),
      location: location.trim(),
      priority,
      assigneeId,
      description: description.trim(),
    });
  };

  const commonLocations = ['Master bedroom', 'Kitchen', 'Living Room', '2nd Floor Corridor', 'Electrical Room', 'Balcony'];

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
        aria-labelledby="modal-snag-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-snag-title" className="modal-title">
              Report a Problem
            </h2>
            <p className="modal-subtitle">
              Record a site problem for {projectName || 'Skyline Residence'}
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
            <label htmlFor="snag-title" className="form-field-label">
              Problem Title <span className="field-required">*</span>
            </label>
            <input
              id="snag-title"
              type="text"
              className="form-text-input"
              placeholder="e.g. Cracked bathroom tile, Door not closing properly"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              required
            />
          </div>

          <div className="form-field-group">
            <label htmlFor="snag-location" className="form-field-label">
              Location <span className="field-required">*</span>
            </label>
            <input
              id="snag-location"
              type="text"
              className="form-text-input"
              placeholder="e.g. Master bedroom, Unit 402, Roof Deck"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <div className="form-quick-chips">
              <span className="chips-label">Quick select:</span>
              {commonLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className="quick-chip-btn"
                  onClick={() => setLocation(loc)}
                  disabled={isSubmitting}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div className="form-grid-two-col">
            <div className="form-field-group">
              <label htmlFor="snag-priority" className="form-field-label">
                Priority
              </label>
              <select
                id="snag-priority"
                className="form-select-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Critical">Critical (Immediate action)</option>
                <option value="High">High (Urgent inspection)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="Low">Low (Minor finish)</option>
              </select>
            </div>

            <div className="form-field-group">
              <label htmlFor="snag-assignee" className="form-field-label">
                Contractor <span className="field-required">*</span>
              </label>
              <select
                id="snag-assignee"
                className="form-select-input"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={isSubmitting}
                required
              >
                <option value="">Select contractor…</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field-group">
            <label htmlFor="snag-description" className="form-field-label">
              Additional Details
            </label>
            <textarea
              id="snag-description"
              className="form-textarea-input"
              rows={3}
              placeholder="Add any helpful details or instructions for resolving this problem…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                  <span>Saving Problem…</span>
                </>
              ) : (
                'Report Problem'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateSnagModal;
