import React from 'react';
import { ArrowRight, AlertTriangle, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function ProjectOverview({
  summary,
  snags = [],
  tasks = [],
  onNavigate,
  projectName = '',
}) {
  const now = new Date();
  const calculatedOverdue = tasks.filter(
    (t) => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now
  ).length;

  const metrics = summary?.metrics || {
    totalSnags: snags.length || 0,
    openSnags: snags.filter((s) => s.status === 'Open').length || 0,
    resolvedSnags: snags.filter((s) => ['Resolved', 'Closed'].includes(s.status)).length || 0,
    totalTasks: tasks.length || 0,
    pendingTasks: tasks.filter((t) => t.status === 'Pending').length || 0,
    completedTasks: tasks.filter((t) => t.status === 'Completed').length || 0,
    overdueTasks: calculatedOverdue,
  };

  const overdueCount = metrics.overdueTasks !== undefined ? metrics.overdueTasks : calculatedOverdue;
  const recentSnags = snags.slice(0, 4);
  const upcomingTasks = tasks.slice(0, 4);

  return (
    <div className="clean-overview-flow" role="region" aria-label="Dashboard Overview">
      {/* Standard Page Header */}
      <div className="registry-page-header">
        <div>
          <h1 className="registry-main-title">Dashboard</h1>
          <p className="registry-main-subtitle">
            Executive summary, voice command controls, and site progress for {projectName || 'Active Project'}
          </p>
        </div>
      </div>
      {/* Four Key Metrics with direct drill-down */}
      <div className="four-metrics-grid">
        <div
          className="metric-box clickable"
          onClick={() => onNavigate && onNavigate('snags', 'Open')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('snags', 'Open')}
          title="Click to view Open Problems"
        >
          <div className="metric-box-top">
            <span className="metric-label">Open Problems</span>
            <AlertTriangle size={15} className="metric-icon-indicator amber" />
          </div>
          <span className="metric-value accent-amber">{metrics.openSnags}</span>
          <span className="metric-sub">{metrics.totalSnags} total recorded problems</span>
        </div>

        <div
          className="metric-box clickable"
          onClick={() => onNavigate && onNavigate('tasks', 'Pending')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('tasks', 'Pending')}
          title="Click to view Pending Tasks"
        >
          <div className="metric-box-top">
            <span className="metric-label">Pending Tasks</span>
            <Clock size={15} className="metric-icon-indicator slate" />
          </div>
          <span className="metric-value accent-cyan">{metrics.pendingTasks}</span>
          <span className="metric-sub">{metrics.totalTasks} total scheduled tasks</span>
        </div>

        <div
          className="metric-box clickable"
          onClick={() => onNavigate && onNavigate('snags', 'Resolved')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('snags', 'Resolved')}
          title="Click to view Resolved Problems"
        >
          <div className="metric-box-top">
            <span className="metric-label">Resolved Problems</span>
            <CheckCircle2 size={15} className="metric-icon-indicator green" />
          </div>
          <span className="metric-value accent-green">{metrics.resolvedSnags}</span>
          <span className="metric-sub">
            {metrics.totalSnags > 0
              ? `${Math.round((metrics.resolvedSnags / metrics.totalSnags) * 100)}% resolved`
              : 'Zero open problems'}
          </span>
        </div>

        <div
          className="metric-box clickable"
          onClick={() => onNavigate && onNavigate('tasks', 'Overdue')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('tasks', 'Overdue')}
          title="Click to view Overdue Tasks"
        >
          <div className="metric-box-top">
            <span className="metric-label">Overdue Tasks</span>
            <ClipboardList size={15} className="metric-icon-indicator rose" />
          </div>
          <span className={`metric-value ${overdueCount > 0 ? 'accent-rose' : 'accent-slate'}`}>
            {overdueCount}
          </span>
          <span className="metric-sub">
            {overdueCount > 0 ? 'Requires site attention' : 'All tasks on schedule'}
          </span>
        </div>
      </div>

      {/* Recent Activity: Clean Two-Column Layout */}
      <div className="overview-activity-split">
        {/* Left: Recent Problems */}
        <div className="activity-column">
          <div className="activity-column-header">
            <div>
              <h2 className="activity-title">Recent Problems</h2>
              <p className="activity-subtitle">Latest reported site issues</p>
            </div>
            {onNavigate && (
              <button
                type="button"
                className="view-all-link"
                onClick={() => onNavigate('snags', 'ALL')}
                aria-label="View all problems"
              >
                <span>View all</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="activity-rows-list">
            {recentSnags.length === 0 ? (
              <div className="activity-empty">No problems reported for this project.</div>
            ) : (
              recentSnags.map((snag) => (
                <div
                  key={snag._id}
                  className="compact-activity-row clickable"
                  onClick={() => onNavigate && onNavigate('snags', 'ALL', snag._id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('snags', 'ALL', snag._id)}
                  title={`View details for ${snag.title}`}
                >
                  <div className="row-content-main">
                    <span className="row-title">{snag.title}</span>
                    <div className="row-meta">
                      {snag.location && (
                        <span className="meta-text">{snag.location}</span>
                      )}
                      {snag.assigneeId?.name && (
                        <span className="meta-text">• {snag.assigneeId.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="row-badges">
                    <StatusBadge status={snag.priority} type="priority" />
                    <StatusBadge status={snag.status} type="status" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Upcoming Tasks */}
        <div className="activity-column">
          <div className="activity-column-header">
            <div>
              <h2 className="activity-title">Upcoming Tasks</h2>
              <p className="activity-subtitle">Scheduled work and deadlines</p>
            </div>
            {onNavigate && (
              <button
                type="button"
                className="view-all-link"
                onClick={() => onNavigate('tasks', 'ALL')}
                aria-label="View all tasks"
              >
                <span>View all</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="activity-rows-list">
            {upcomingTasks.length === 0 ? (
              <div className="activity-empty">No upcoming tasks scheduled.</div>
            ) : (
              upcomingTasks.map((task) => (
                <div
                  key={task._id}
                  className="compact-activity-row clickable"
                  onClick={() => onNavigate && onNavigate('tasks', 'ALL', task._id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => e.key === 'Enter' && onNavigate && onNavigate('tasks', 'ALL', task._id)}
                  title={`View details for ${task.title}`}
                >
                  <div className="row-content-main">
                    <span className="row-title">{task.title}</span>
                    <div className="row-meta">
                      {task.dueDate && (
                        <span className="meta-text">
                          Deadline:{' '}
                          {new Date(task.dueDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                      {task.assigneeId?.name && (
                        <span className="meta-text">• {task.assigneeId.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="row-badges">
                    <StatusBadge status={task.status} type="status" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectOverview;
