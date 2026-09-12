import React from 'react';

/**
 * Status and Priority badge with AEC industrial styling.
 */
export function StatusBadge({ status, type = 'status' }) {
  if (!status) return null;

  const normalized = String(status).trim().toLowerCase();

  let badgeClass = 'badge-default';

  if (type === 'priority') {
    if (normalized === 'critical') badgeClass = 'badge-priority-critical';
    else if (normalized === 'high') badgeClass = 'badge-priority-high';
    else if (normalized === 'medium') badgeClass = 'badge-priority-medium';
    else if (normalized === 'low') badgeClass = 'badge-priority-low';
  } else {
    // Status badges
    if (normalized === 'open') badgeClass = 'badge-status-open';
    else if (normalized === 'in progress') badgeClass = 'badge-status-in-progress';
    else if (normalized === 'resolved') badgeClass = 'badge-status-resolved';
    else if (normalized === 'closed') badgeClass = 'badge-status-closed';
    else if (normalized === 'pending') badgeClass = 'badge-status-pending';
    else if (normalized === 'completed') badgeClass = 'badge-status-completed';
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

export default StatusBadge;
