import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function TaskList({ tasks = [], isLoading }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const now = new Date();

  // Unique assignees for filter
  const assignees = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.assigneeId?._id && t.assigneeId?.name) {
        map.set(t.assigneeId._id, t.assigneeId.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const isOverdue =
        task.status !== 'Completed' &&
        task.dueDate &&
        new Date(task.dueDate) < now;

      let matchesStatus = true;
      if (statusFilter === 'ALL') {
        matchesStatus = true;
      } else if (statusFilter === 'Overdue') {
        matchesStatus = isOverdue;
      } else {
        matchesStatus = task.status?.toLowerCase() === statusFilter.toLowerCase();
      }

      const matchesAssignee =
        assigneeFilter === 'ALL' ||
        task.assigneeId?._id === assigneeFilter;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        task.title?.toLowerCase().includes(query) ||
        task.assigneeId?.name?.toLowerCase().includes(query);

      return matchesStatus && matchesAssignee && matchesSearch;
    });
  }, [tasks, statusFilter, assigneeFilter, searchQuery, now]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="registry-page-view" role="region" aria-label="Work to Do (Tasks) Schedule">
      {/* Top Header */}
      <div className="registry-page-header">
        <h1 className="registry-main-title">Work to Do (Tasks)</h1>
        <p className="registry-main-subtitle">Manage project work, deadlines, and scheduled tasks.</p>
      </div>

      {/* Compact Toolbar */}
      <div className="compact-toolbar">
        <div className="toolbar-search-field">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input
            type="text"
            className="toolbar-input"
            placeholder="Search work tasks by title or contractor…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search work tasks"
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
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Overdue">Overdue</option>
          </select>

          {assignees.length > 0 && (
            <select
              className="toolbar-select"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              aria-label="Filter by assignee"
            >
              <option value="ALL">All Assignees</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Clean Table / List */}
      {isLoading ? (
        <div className="table-empty-msg">Loading work (tasks)…</div>
      ) : filteredTasks.length === 0 ? (
        <div className="table-empty-msg">No work items match your current filters.</div>
      ) : (
        <div className="registry-table-container">
          <table className="clean-data-table">
            <thead>
              <tr>
                <th className="th-title">Task</th>
                <th className="th-status">Status</th>
                <th className="th-assignee">Assigned to</th>
                <th className="th-due">Due date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.status !== 'Completed' &&
                  task.dueDate &&
                  new Date(task.dueDate) < now;
                const isExpanded = expandedId === task._id;

                const formattedDate = task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <React.Fragment key={task._id}>
                    <tr
                      className={`data-table-row ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleExpand(task._id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && toggleExpand(task._id)}
                    >
                      <td className="cell-title">
                        <div className="cell-title-wrap">
                          <span>{task.title}</span>
                          {task.description && (
                            <span className="expand-indicator">
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="cell-status">
                        <StatusBadge status={task.status} type="status" />
                      </td>
                      <td className="cell-assignee">
                        {task.assigneeId?.name ? (
                          <span className="assignee-label">{task.assigneeId.name}</span>
                        ) : (
                          <span className="unassigned-label">Unassigned</span>
                        )}
                      </td>
                      <td className="cell-due">
                        <span className={isOverdue ? 'due-overdue' : 'due-normal'}>
                          {formattedDate}
                          {isOverdue && <span className="overdue-tag">Overdue</span>}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && task.description && (
                      <tr className="data-table-subrow">
                        <td colSpan={4} className="cell-subrow-content">
                          <p className="subrow-desc">{task.description}</p>
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

export default TaskList;
