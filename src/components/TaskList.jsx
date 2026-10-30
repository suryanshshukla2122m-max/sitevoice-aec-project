import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2, Clock, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function TaskList({
  tasks = [],
  isLoading,
  onOpenCreate,
  onUpdateStatus,
  onDeleteTask,
  initialFilter = 'ALL',
  initialExpandedId = null,
  projectName = '',
  canDelete = true,
}) {
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(initialExpandedId);
  const [updatingId, setUpdatingId] = useState(null);

  const now = new Date();

  useEffect(() => {
    if (initialFilter) setStatusFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (initialExpandedId) setExpandedId(initialExpandedId);
  }, [initialExpandedId]);

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

  const handleStatusChange = async (taskId, newStatus) => {
    if (!onUpdateStatus || updatingId) return;
    setUpdatingId(taskId);
    try {
      await onUpdateStatus(taskId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === 'Pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const overdueCount = tasks.filter(
    (t) => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now
  ).length;

  return (
    <div className="registry-page-view" role="region" aria-label="Tasks List">
      {/* Top Header */}
      <div className="registry-page-header">
        <div className="registry-header-title-wrap">
          <div>
            <h1 className="registry-main-title">Tasks</h1>
            <p className="registry-main-subtitle">
              Site assignments, inspections, and upcoming deadlines for {projectName || 'Active Project'}
            </p>
          </div>
          <div className="registry-header-stats">
            <button
              type="button"
              className={`stat-pill-btn slate ${statusFilter === 'Pending' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
              title="Filter by Pending tasks"
            >
              <Clock size={13} />
              <span>{pendingCount} Pending</span>
            </button>
            <button
              type="button"
              className={`stat-pill-btn amber ${statusFilter === 'In Progress' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'In Progress' ? 'ALL' : 'In Progress')}
              title="Filter by In Progress tasks"
            >
              <Clock size={13} />
              <span>{inProgressCount} In Progress</span>
            </button>
            <button
              type="button"
              className={`stat-pill-btn green ${statusFilter === 'Completed' ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'ALL' : 'Completed')}
              title="Filter by Completed tasks"
            >
              <CheckCircle2 size={13} />
              <span>{completedCount} Completed</span>
            </button>
            {overdueCount > 0 && (
              <button
                type="button"
                className={`stat-pill-btn rose ${statusFilter === 'Overdue' ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === 'Overdue' ? 'ALL' : 'Overdue')}
                title="Filter by Overdue tasks"
              >
                <Calendar size={13} />
                <span>{overdueCount} Overdue</span>
              </button>
            )}
          </div>
        </div>

        {onOpenCreate && (
          <button
            type="button"
            className="btn-create-record"
            onClick={onOpenCreate}
            aria-label="Create a new task"
          >
            <Plus size={16} />
            <span>Create Task</span>
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
            placeholder="Search tasks by name, role, or contractor…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tasks"
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
            <option value="ALL">All Statuses ({tasks.length})</option>
            <option value="Pending">Pending ({pendingCount})</option>
            <option value="In Progress">In Progress ({inProgressCount})</option>
            <option value="Completed">Completed ({completedCount})</option>
            {overdueCount > 0 && <option value="Overdue">Overdue ({overdueCount})</option>}
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
        <div className="table-empty-msg">
          <span className="spinner-dot" />
          <span>Loading tasks from MongoDB…</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="registry-empty-state">
          <div className="empty-state-icon">
            <Calendar size={24} />
          </div>
          <h3 className="empty-state-title">No tasks match your current filters</h3>
          <p className="empty-state-subtitle">
            {searchQuery || statusFilter !== 'ALL' || assigneeFilter !== 'ALL'
              ? 'Try clearing your search query or status filter.'
              : 'No scheduled tasks have been created yet.'}
          </p>
          {onOpenCreate && (
            <button
              type="button"
              className="btn-create-record btn-empty-cta"
              onClick={onOpenCreate}
            >
              <Plus size={15} />
              <span>Create Task</span>
            </button>
          )}
        </div>
      ) : (
        <div className="registry-table-container">
          <table className="clean-data-table">
            <thead>
              <tr>
                <th className="th-title">Task Name</th>
                <th className="th-status">Status</th>
                <th className="th-assignee">Assigned To</th>
                <th className="th-due">Deadline</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const isOverdue =
                  task.status !== 'Completed' &&
                  task.dueDate &&
                  new Date(task.dueDate) < now;

                const isExpanded = expandedId === task._id;
                const isUpdating = updatingId === task._id;

                const formattedDate = task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'No deadline';

                return (
                  <React.Fragment key={task._id}>
                    <tr
                      className={`data-table-row ${isExpanded ? 'is-expanded' : ''} ${isOverdue ? 'row-overdue' : ''}`}
                      onClick={() => toggleExpand(task._id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && toggleExpand(task._id)}
                    >
                      <td className="cell-title">
                        <div className="cell-title-wrap">
                          <span className={`record-main-title ${task.status === 'Completed' ? 'title-completed' : ''}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="expand-indicator" title="Toggle work details">
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="cell-status" onClick={(e) => e.stopPropagation()}>
                        {onUpdateStatus ? (
                          <select
                            className={`table-inline-status-select status-${(task.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`}
                            value={task.status}
                            disabled={isUpdating}
                            onChange={(e) => handleStatusChange(task._id, e.target.value)}
                            aria-label={`Change status for ${task.title}`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        ) : (
                          <StatusBadge status={task.status} type="status" />
                        )}
                      </td>
                      <td className="cell-assignee">
                        {task.assigneeId?.name ? (
                          <div className="assignee-cell-info">
                            <span className="assignee-label">{task.assigneeId.name}</span>
                            {task.assigneeId.role && (
                              <span className="assignee-role-sub">{task.assigneeId.role}</span>
                            )}
                          </div>
                        ) : (
                          <span className="unassigned-label">Unassigned</span>
                        )}
                      </td>
                      <td className="cell-due">
                        <div className="due-date-cell">
                          <span className={`due-date-text ${isOverdue ? 'date-overdue' : ''}`}>
                            {formattedDate}
                          </span>
                          {isOverdue && <span className="overdue-tag">Overdue</span>}
                        </div>
                      </td>
                      <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions-group">
                          {onUpdateStatus && task.status !== 'Completed' && (
                            <button
                              type="button"
                              className="action-btn-quick-resolve"
                              onClick={() => handleStatusChange(task._id, 'Completed')}
                              disabled={isUpdating}
                              title="Mark completed"
                              aria-label="Mark completed"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          {onDeleteTask && (
                            <button
                              type="button"
                              className="action-btn-delete"
                              onClick={() => onDeleteTask(task)}
                              title="Delete task"
                              aria-label={`Delete task ${task.title}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && task.description && (
                      <tr className="data-table-subrow">
                        <td colSpan={5} className="cell-subrow-content">
                          <div className="subrow-inner">
                            <span className="subrow-heading">Work Details:</span>
                            <p className="subrow-desc">{task.description}</p>
                            <div className="subrow-meta">
                              <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
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

export default TaskList;
