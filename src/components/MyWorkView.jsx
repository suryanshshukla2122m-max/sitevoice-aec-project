import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  AlertTriangle,
  MessageSquarePlus,
  Calendar,
  Building2,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export function MyWorkView({
  tasks = [],
  isLoading = false,
  currentUser,
  onUpdateStatus,
  onAddUpdate,
  onReportProblem,
  onOpenTaskDetails,
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeUpdateTaskId, setActiveUpdateTaskId] = useState(null);
  const [updateText, setUpdateText] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const now = new Date();

  // Filter tasks assigned to this worker
  const filteredTasks = tasks.filter((task) => {
    // Status filter
    if (filterStatus === 'PENDING' && task.status !== 'Pending') return false;
    if (filterStatus === 'IN_PROGRESS' && task.status !== 'In Progress') return false;
    if (filterStatus === 'COMPLETED' && task.status !== 'Completed') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      const matchProj = task.projectId?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchProj) return false;
    }

    return true;
  });

  // Calculate quick stats
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === 'Pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const overdueCount = tasks.filter(
    (t) => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now
  ).length;

  const handlePostUpdate = async (taskId) => {
    if (!updateText.trim()) return;
    setIsSubmittingUpdate(true);
    try {
      await onAddUpdate(taskId, updateText.trim());
      setUpdateText('');
      setActiveUpdateTaskId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  return (
    <div className="my-work-container">
      {/* Standard Page Header */}
      <div className="registry-page-header">
        <div>
          <h1 className="registry-main-title">My Work</h1>
          <p className="registry-main-subtitle">
            Tasks assigned directly to you across sites. Start work, post progress notes, or report site problems.
          </p>
        </div>
        {currentUser && (
          <div className="status-header-meta">
            <span className="project-badge-large">
              <span>{currentUser.role}</span>
              {currentUser.company && <span className="text-muted">• {currentUser.company}</span>}
            </span>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="my-work-stats-grid">
        <button
          type="button"
          className={`work-stat-card ${filterStatus === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setFilterStatus('ALL')}
        >
          <div className="work-stat-label">Total Assigned</div>
          <div className="work-stat-value">{totalCount}</div>
        </button>

        <button
          type="button"
          className={`work-stat-card ${filterStatus === 'PENDING' ? 'is-active' : ''}`}
          onClick={() => setFilterStatus('PENDING')}
        >
          <div className="work-stat-label">Pending Start</div>
          <div className="work-stat-value">{pendingCount}</div>
        </button>

        <button
          type="button"
          className={`work-stat-card ${filterStatus === 'IN_PROGRESS' ? 'is-active' : ''}`}
          onClick={() => setFilterStatus('IN_PROGRESS')}
        >
          <div className="work-stat-label">In Progress</div>
          <div className="work-stat-value text-blue">{inProgressCount}</div>
        </button>

        <button
          type="button"
          className={`work-stat-card ${filterStatus === 'COMPLETED' ? 'is-active' : ''}`}
          onClick={() => setFilterStatus('COMPLETED')}
        >
          <div className="work-stat-label">Completed</div>
          <div className="work-stat-value text-green">{completedCount}</div>
        </button>

        {overdueCount > 0 && (
          <div className="work-stat-card is-overdue">
            <div className="work-stat-label">Overdue</div>
            <div className="work-stat-value text-red">{overdueCount}</div>
          </div>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="my-work-toolbar">
        <div className="work-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by task title, details, or project name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="work-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="work-filter-chips">
          <button
            type="button"
            className={`filter-chip ${filterStatus === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${filterStatus === 'PENDING' ? 'is-active' : ''}`}
            onClick={() => setFilterStatus('PENDING')}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${filterStatus === 'IN_PROGRESS' ? 'is-active' : ''}`}
            onClick={() => setFilterStatus('IN_PROGRESS')}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            type="button"
            className={`filter-chip ${filterStatus === 'COMPLETED' ? 'is-active' : ''}`}
            onClick={() => setFilterStatus('COMPLETED')}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="work-loading-state">
          <div className="loading-spinner" />
          <p>Loading your assigned tasks from database...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="work-empty-state">
          <CheckCircle2 size={40} className="empty-icon" />
          <h3>No tasks found</h3>
          <p>
            {searchQuery
              ? `No assigned tasks match "${searchQuery}".`
              : filterStatus !== 'ALL'
              ? `You have no ${filterStatus.toLowerCase().replace('_', ' ')} tasks right now.`
              : 'You currently have no tasks assigned to you across projects.'}
          </p>
        </div>
      ) : (
        <div className="my-work-task-cards">
          {filteredTasks.map((task) => {
            const isOverdue =
              task.status !== 'Completed' &&
              task.dueDate &&
              new Date(task.dueDate) < now;

            const isDueToday =
              task.status !== 'Completed' &&
              task.dueDate &&
              new Date(task.dueDate).toDateString() === now.toDateString();

            const isUpdating = activeUpdateTaskId === task._id;

            return (
              <div
                key={task._id}
                className={`my-work-card ${task.status === 'Completed' ? 'is-completed' : ''} ${
                  isOverdue ? 'is-overdue-card' : ''
                }`}
              >
                {/* Card Top: Project Name & Status */}
                <div className="work-card-top">
                  <div className="work-card-project">
                    <Building2 size={13} className="project-icon" />
                    <span className="project-name-label">
                      {task.projectId?.name || 'Project'}
                    </span>
                    {task.projectId?.code && (
                      <span className="project-code-tag">{task.projectId.code}</span>
                    )}
                  </div>

                  <div className="work-card-badges">
                    {task.priority && (
                      <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                        {task.priority} Priority
                      </span>
                    )}
                    <StatusBadge status={task.status} />
                  </div>
                </div>

                {/* Card Body */}
                <div className="work-card-body">
                  <h3 className="work-task-title">{task.title}</h3>

                  {task.description && (
                    <div className="work-task-desc">
                      <span className="desc-label">Work Details: </span>
                      <span>{task.description}</span>
                    </div>
                  )}

                  {task.instructions && (
                    <div className="work-task-instructions">
                      <span className="desc-label">Instructions: </span>
                      <span>{task.instructions}</span>
                    </div>
                  )}

                  {/* Deadline & Overdue alerts */}
                  <div className="work-card-meta">
                    <div className={`work-date-item ${isOverdue ? 'is-overdue' : isDueToday ? 'is-today' : ''}`}>
                      <Calendar size={13} />
                      <span>
                        Deadline:{' '}
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'No deadline set'}
                      </span>
                      {isOverdue && <span className="overdue-chip">Overdue</span>}
                      {isDueToday && <span className="today-chip">Due Today</span>}
                    </div>
                  </div>

                  {/* Progress Updates Log */}
                  {task.updates && task.updates.length > 0 && (
                    <div className="work-updates-history">
                      <div className="updates-title">Progress Updates ({task.updates.length})</div>
                      <div className="updates-list">
                        {task.updates.map((upd, idx) => (
                          <div key={idx} className="update-item">
                            <span className="update-author">{upd.authorName}:</span>
                            <span className="update-text">{upd.text}</span>
                            <span className="update-time">
                              {new Date(upd.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Add Update Form */}
                  {isUpdating && (
                    <div className="inline-update-box">
                      <textarea
                        rows={2}
                        placeholder="Write a progress note (e.g., Conduit laid up to bay 4, awaiting inspection)..."
                        value={updateText}
                        onChange={(e) => setUpdateText(e.target.value)}
                        className="inline-update-textarea"
                        autoFocus
                      />
                      <div className="inline-update-actions">
                        <button
                          type="button"
                          className="btn-cancel-update"
                          onClick={() => {
                            setActiveUpdateTaskId(null);
                            setUpdateText('');
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-submit-update"
                          disabled={!updateText.trim() || isSubmittingUpdate}
                          onClick={() => handlePostUpdate(task._id)}
                        >
                          {isSubmittingUpdate ? 'Saving...' : 'Post Update'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="work-card-footer">
                  <div className="footer-left-actions">
                    {/* Add Update Button */}
                    {!isUpdating && (
                      <button
                        type="button"
                        className="work-btn-secondary"
                        onClick={() => {
                          setActiveUpdateTaskId(task._id);
                          setUpdateText('');
                        }}
                      >
                        <MessageSquarePlus size={14} />
                        <span>Add Update</span>
                      </button>
                    )}

                    {/* Report a Problem on this task */}
                    <button
                      type="button"
                      className="work-btn-warning"
                      onClick={() => onReportProblem && onReportProblem(task)}
                      title="Report a problem related to this work"
                    >
                      <AlertTriangle size={14} />
                      <span>Report a Problem</span>
                    </button>
                  </div>

                  <div className="footer-right-actions">
                    {/* Start Work button (Pending -> In Progress) */}
                    {task.status === 'Pending' && (
                      <button
                        type="button"
                        className="work-btn-start"
                        onClick={() => onUpdateStatus(task._id, 'In Progress')}
                      >
                        <Play size={13} fill="currentColor" />
                        <span>Start Work</span>
                      </button>
                    )}

                    {/* In Progress -> Complete button */}
                    {task.status === 'In Progress' && (
                      <button
                        type="button"
                        className="work-btn-complete"
                        onClick={() => onUpdateStatus(task._id, 'Completed')}
                      >
                        <CheckCircle2 size={14} />
                        <span>Mark as Completed</span>
                      </button>
                    )}

                    {/* Reopen if Completed */}
                    {task.status === 'Completed' && (
                      <button
                        type="button"
                        className="work-btn-reopen"
                        onClick={() => onUpdateStatus(task._id, 'In Progress')}
                      >
                        <Clock size={13} />
                        <span>Reopen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyWorkView;
