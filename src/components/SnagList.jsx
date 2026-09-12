import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function SnagList({ snags = [], isLoading }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

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

  return (
    <div className="registry-page-view" role="region" aria-label="Problems (Snags) Registry">
      {/* Top Header */}
      <div className="registry-page-header">
        <h1 className="registry-main-title">Problems (Snags)</h1>
        <p className="registry-main-subtitle">Track and manage project defects and punch list snags.</p>
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
            <option value="ALL">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
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
        <div className="table-empty-msg">Loading problems (snags)…</div>
      ) : filteredSnags.length === 0 ? (
        <div className="table-empty-msg">No problems match your current filters.</div>
      ) : (
        <div className="registry-table-container">
          <table className="clean-data-table">
            <thead>
              <tr>
                <th className="th-title">Title</th>
                <th className="th-loc">Location</th>
                <th className="th-prio">Priority</th>
                <th className="th-status">Status</th>
                <th className="th-assignee">Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnags.map((snag) => {
                const isExpanded = expandedId === snag._id;
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
                          <span>{snag.title}</span>
                          {snag.description && (
                            <span className="expand-indicator">
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="cell-loc">{snag.location || '—'}</td>
                      <td className="cell-prio">
                        <StatusBadge status={snag.priority} type="priority" />
                      </td>
                      <td className="cell-status">
                        <StatusBadge status={snag.status} type="status" />
                      </td>
                      <td className="cell-assignee">
                        {snag.assigneeId?.name ? (
                          <span className="assignee-label">{snag.assigneeId.name}</span>
                        ) : (
                          <span className="unassigned-label">Unassigned</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && snag.description && (
                      <tr className="data-table-subrow">
                        <td colSpan={5} className="cell-subrow-content">
                          <p className="subrow-desc">{snag.description}</p>
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

