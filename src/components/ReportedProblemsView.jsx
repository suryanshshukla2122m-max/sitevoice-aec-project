import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export function ReportedProblemsView({
  snags = [],
  currentUser,
  selectedProject,
  isLoading = false,
  onOpenReportProblem,
  onUpdateStatus,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Filter problems reported by or assigned to this user
  const userProblems = useMemo(() => {
    if (!currentUser) return snags;
    return snags.filter((s) => {
      const isReporter =
        s.reporterId?._id === currentUser._id ||
        s.reporterId === currentUser._id ||
        s.reporterName === currentUser.name;
      const isAssignee =
        s.assigneeId?._id === currentUser._id ||
        s.assigneeId === currentUser._id ||
        s.assigneeId?.name === currentUser.name;
      return isReporter || isAssignee;
    });
  }, [snags, currentUser]);

  const filteredProblems = useMemo(() => {
    return userProblems.filter((snag) => {
      if (statusFilter !== 'ALL' && snag.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = snag.title?.toLowerCase().includes(q);
        const matchLoc = snag.location?.toLowerCase().includes(q);
        const matchDesc = snag.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchDesc) return false;
      }

      return true;
    });
  }, [userProblems, statusFilter, searchQuery]);

  const openCount = userProblems.filter((s) => s.status === 'Open').length;
  const inProgressCount = userProblems.filter((s) => s.status === 'In Progress').length;
  const resolvedCount = userProblems.filter((s) => ['Resolved', 'Closed'].includes(s.status)).length;

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

  return (
    <div className="registry-page-view" role="region" aria-label="Problems I Reported">
      {/* Standard Page Header */}
      <div className="registry-page-header">
        <div className="registry-header-title-wrap">
          <div>
            <h1 className="registry-main-title">Problems I Reported</h1>
            <p className="registry-main-subtitle">
              Issues you reported or punch list items assigned to your trade on {selectedProject?.name || 'Active Project'}
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

        {onOpenReportProblem && (
          <button
            type="button"
            className="btn-create-record"
            onClick={onOpenReportProblem}
            aria-label="Report a new problem"
          >
            <Plus size={16} />
            <span>Report a Problem</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="compact-toolbar">
        <div className="toolbar-search-field">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="toolbar-input"
            placeholder="Search problems by title, location, or details…"
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
            <option value="ALL">All Problems ({userProblems.length})</option>
            <option value="Open">Open ({openCount})</option>
            <option value="In Progress">In Progress ({inProgressCount})</option>
            <option value="Resolved">Resolved ({resolvedCount})</option>
          </select>
        </div>
      </div>

      {/* Problems Data Table */}
      {isLoading ? (
        <div className="table-empty-msg">
          <span className="spinner-dot" />
          <span>Loading problems from MongoDB…</span>
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="registry-empty-state">
          <div className="empty-state-icon">
            <AlertTriangle size={24} />
          </div>
          <h3 className="empty-state-title">No problems found</h3>
          <p className="empty-state-subtitle">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try clearing your search query or status filter.'
              : 'You have not reported or been assigned any problems on this project.'}
          </p>
          {onOpenReportProblem && (
            <button
              type="button"
              className="btn-create-record btn-empty-cta"
              onClick={onOpenReportProblem}
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
                <th className="th-title">Problem / Description</th>
                <th className="th-loc">Location</th>
                <th className="th-prio">Priority</th>
                <th className="th-status">Status</th>
                <th className="th-assignee">Assigned Contractor</th>
                <th className="th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map((snag) => {
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
                            <span className="expand-indicator" title="Toggle details">
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
                            className={`table-inline-status-select status-${(snag.status || 'open')
                              .toLowerCase()
                              .replace(/\s+/g, '-')}`}
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
                        {snag.status !== 'Resolved' && onUpdateStatus && (
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

export default ReportedProblemsView;
