import React from 'react';
import { ArrowRight } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function ProjectOverview({
  summary,
  snags = [],
  tasks = [],
  onNavigate,
}) {
  const metrics = summary?.metrics || {
    totalSnags: snags.length || 0,
    openSnags: snags.filter((s) => s.status === 'Open').length || 0,
    resolvedSnags: snags.filter((s) => ['Resolved', 'Closed'].includes(s.status)).length || 0,
    totalTasks: tasks.length || 0,
    pendingTasks: tasks.filter((t) => t.status === 'Pending').length || 0,
    completedTasks: tasks.filter((t) => t.status === 'Completed').length || 0,
    overdueTasks: 0,
  };

  const recentSnags = snags.slice(0, 4);
  const upcomingTasks = tasks.slice(0, 4);

  return (
    <div className="clean-overview-flow" role="region" aria-label="Project Overview">
      {/* Four Overview Metrics */}
      <div className="four-metrics-grid">
        <div className="metric-box">
          <span className="metric-label">Open Problems</span>
          <span className="metric-value accent-amber">{metrics.openSnags}</span>
          <span className="metric-sub">{metrics.totalSnags} total snags</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Pending Work</span>
          <span className="metric-value accent-cyan">{metrics.pendingTasks}</span>
          <span className="metric-sub">{metrics.totalTasks} total tasks</span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Resolved Problems</span>
          <span className="metric-value accent-green">{metrics.resolvedSnags}</span>
          <span className="metric-sub">
            {metrics.totalSnags > 0
              ? `${Math.round((metrics.resolvedSnags / metrics.totalSnags) * 100)}% resolved`
              : 'Zero logged'}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Overdue Work</span>
          <span className={`metric-value ${metrics.overdueTasks > 0 ? 'accent-rose' : 'accent-slate'}`}>
            {metrics.overdueTasks}
          </span>
          <span className="metric-sub">
            {metrics.overdueTasks > 0 ? 'Action required' : 'On schedule'}
          </span>
        </div>
      </div>

      {/* Recent Activity: Clean Two-Column Layout */}
      <div className="overview-activity-split">
        {/* Left: Recent Problems */}
        <div className="activity-column">
          <div className="activity-column-header">
            <h2 className="activity-title">Recent Problems</h2>
            {onNavigate && (
              <button
                type="button"
                className="view-all-link"
                onClick={() => onNavigate('snags')}
              >
                <span>View all</span>
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="activity-rows-list">
            {recentSnags.length === 0 ? (
              <div className="activity-empty">No problems recorded.</div>
            ) : (
              recentSnags.map((snag) => (
                <div key={snag._id} className="compact-activity-row">
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

        {/* Right: Upcoming Work */}
        <div className="activity-column">
          <div className="activity-column-header">
            <h2 className="activity-title">Upcoming Work</h2>
            {onNavigate && (
              <button
                type="button"
                className="view-all-link"
                onClick={() => onNavigate('tasks')}
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
                <div key={task._id} className="compact-activity-row">
                  <div className="row-content-main">
                    <span className="row-title">{task.title}</span>
                    <div className="row-meta">
                      {task.dueDate && (
                        <span className="meta-text">
                          Due{' '}
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
