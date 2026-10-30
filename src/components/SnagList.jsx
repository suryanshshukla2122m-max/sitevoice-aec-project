import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function SnagList({
  snags = [],
  isLoading,
  onOpenCreate,
  onUpdateStatus,
  onDeleteSnag,
  initialFilter = 'ALL',
  initialExpandedId = null,
  projectName = '',
}) {
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(initialExpandedId);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (initialFilter) setStatusFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (initialExpandedId) setExpandedId(initialExpandedId);
  }, [initialExpandedId]);

  const filteredSnags = useMemo(() => {
    return snags.filter((snag) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        snag.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === 'ALL' ||
        snag.priority?.toLowerCase() === priorityFilter.toLowerCase();

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        snag.title?.toLowerCase().includes(query) ||
        snag.location?.toLowerCase().includes(query) ||
        snag.assigneeId?.name?.toLowerCase().includes(query);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [snags, statusFilter, priorityFilter, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleStatusChange = async (snagId, newStatus) => {
    if (!onUpdateStatus || updatingId) return;
    setUpdatingId(snagId);
    try {
      await onUpdateStatus(snagId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const openCount = snags.filter((s) => s.status === 'Open').length;
  const inProgressCount = snags.filter((s) => s.status === 'In Progress').length;
  const resolvedCount = snags.filter((s) => ['Resolved', 'Closed'].includes(s.status)).length;

  return (
    <div className="registry-page-view" role="region" aria-label="Problems List">
      {/* Top Header */}
      <div className="registry-page-header">
        <div className="registry-header-title-wrap">
          <div>
            <h1 className="registry-main-title">Problems</h1>
            <p className="registry-main-subtitle">
              Track and resolve site issues and punch list items for {projectName || 'Active Project'}
            </p>
          </div>
          <div className="registry-header-stats">
            <button
              type="button"
              className={`stat-pill-btn amber ${statusFilter === 'Open' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'Open' ? 'ALL' : 'Open')}
              title="Filter by Open problems"
            >
              <AlertTriangle size={13} />
              <span>{openCount} Open</span>
            </button>
            <button
              type="button"
              className={`stat-pill-btn slate ${statusFilter === 'In Progress' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'ALL' : 'In Progress')}
              title="Filter by In Progress problems"
            >
              <Clock size={13} />
              <span>{inProgressCount} In Progress</span>
            </button>
            <button
              type="button"
              className={`stat-pill-btn green ${statusFilter === 'Resolved' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'Resolved' ? 'ALL' : 'Resolved')}
              title="Filter by Resolved problems"
            >
              <CheckCircle2 size={13} />
              <span>{resolvedCount} Resolved</span>
            </button>
          </div>
        </div>

        {onOpenCreate && (
          <button
            type="button"
            className="btn-create-record"
            onClick={onOpenCreate}
            aria-label="Report a new problem"
          >
            <Plus size={16} />
            <span>Report a Problem</span>
          </button>
        )}
      </div>

      {/* Compact Toolbar */}
      <div className="compact-toolbar">
        <div className="toolbar-search-field">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="toolbar-input"
            placeholder="Search problems by title, location, or contractor…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search problems"
          />
          {searchQuery && (
            <button
              type="button"
              className="toolbar-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="toolbar-filters">
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses ({snags.length})</option>
            <option value="Open">Open ({openCount})</option>
            <option value="In Progress">In Progress ({inProgressCount})</option>
            <option value="Resolved">Resolved ({resolvedCount})</option>
          </select>

          <select
            className="toolbar-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Clean Table / List */}
      {isLoading ? (
        <div className="table-empty-msg">
          <span className="spinner-dot" />
          <span>Loading problems from MongoDB…</span>
        </div>
      ) : filteredSnags.length === 0 ? (
        <div className="registry-empty-state">
          <div className="empty-state-icon">
            <AlertTriangle size={24} />
          </div>
          <h3 className="empty-state-title">No problems match your current filters</h3>
          <p className="empty-state-subtitle">
            {searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Try adjusting your search query or status filter.'
              : 'All reported problems have been resolved, or no problems have been reported yet.'}
          </p>
          {onOpenCreate && (
            <button
              type="button"
              className="btn-create-record btn-empty-cta"
              onClick={onOpenCreate}
            >
              <Plus size={15} />
              <span>Report a Problem</span>
            </button>
          )}
        </div>
      ) : (
        <div className="registry-table-container">
          <table className="clean-data-table">
            <thead>
              <tr>
                <th className="th-title">Problem / Title</th>
                <th className="th-loc">Location</th>
                <th className="th-prio">Priority</th>
                <th className="th-status">Problem Status</th>
                <th className="th-assignee">Assigned To</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnags.map((snag) => {
                const isExpanded = expandedId === snag._id;
                const isUpdating = updatingId === snag._id;
                return (
                  <React.Fragment key={snag._id}>
                    <tr
                      className={`data-table-row ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleExpand(snag._id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && toggleExpand(snag._id)}
                    >
                      <td className="cell-title">
                        <div className="cell-title-wrap">
                          <span className="record-main-title">{snag.title}</span>
                          {snag.description && (
                            <span className="expand-indicator" title="Toggle additional details">
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="cell-loc">
                        <span className="loc-text">{snag.location || 'Site / General'}</span>
                      </td>
                      <td className="cell-prio">
                        <StatusBadge status={snag.priority} type="priority" />
                      </td>
                      <td className="cell-status" onClick={(e) => e.stopPropagation()}>
                        {onUpdateStatus ? (
                          <select
                            className={`table-inline-status-select status-${(snag.status || 'open').toLowerCase().replace(/\s+/g, '-')}`}
                            value={snag.status}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusChange(snag._id, e.target.value)}
                            aria-label={`Change status for ${snag.title}`}
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        ) : (
                          <StatusBadge status={snag.status} type="status" />
                        )}
                      </td>
                      <td className="cell-assignee">
                        {snag.assigneeId?.name ? (
                          <div className="assignee-cell-info">
                            <span className="assignee-label">{snag.assigneeId.name}</span>
                            {snag.assigneeId.role && (
                              <span className="assignee-role-sub">{snag.assigneeId.role}</span>
                            )}
                          </div>
                        ) : (
                          <span className="unassigned-label">Unassigned</span>
                        )}
                      </td>
                      <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions-group">
                          {onUpdateStatus && snag.status !== 'Resolved' && (
                            <button
                              type="button"
                              className="action-btn-quick-resolve"
                              onClick={() => handleStatusChange(snag._id, 'Resolved')}
                              disabled={isUpdating}
                              title="Mark resolved"
                              aria-label="Mark resolved"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          {onDeleteSnag && (
                            <button
                              type="button"
                              className="action-btn-delete"
                              onClick={() => onDeleteSnag(snag)}
                              title="Delete problem"
                              aria-label={`Delete problem ${snag.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && snag.description && (
                      <tr className="data-table-subrow">
                        <td colSpan={6} className="cell-subrow-content">
                          <div className="subrow-inner">
                            <span className="subrow-heading">Additional Details:</span>
                            <p className="subrow-desc">{snag.description}</p>
                            <div className="subrow-meta">
                              <span>Recorded: {new Date(snag.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SnagList;
