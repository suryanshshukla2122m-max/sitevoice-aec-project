import React from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Building2,
  MapPin,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export function ProjectStatusView({ project, summary, snags = [], tasks = [], isLoading }) {
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
  const team = summary?.team || [];

  const snagResolutionRate =
    metrics.totalSnags > 0
      ? Math.round((metrics.resolvedSnags / metrics.totalSnags) * 100)
      : 100;

  const taskCompletionRate =
    metrics.totalTasks > 0
      ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
      : 0;

  return (
    <div className="registry-page-view" role="region" aria-label="Project Status">
      {/* Top Header */}
      <div className="registry-page-header">
        <div>
          <h1 className="registry-main-title">Project Status</h1>
          <p className="registry-main-subtitle">
            Summary of project progress, problem resolutions, and contractor workloads for {project?.name || 'Skyline Residence'}
          </p>
        </div>
        {project && (
          <div className="status-header-meta">
            <span className="project-badge-large">
              <Building2 size={14} />
              <span>{project.code || 'SKY-204'}</span>
            </span>
          </div>
        )}
      </div>

      {/* Health Breakdown Cards */}
      <div className="status-metrics-row">
        {/* Problems Breakdown */}
        <div className="status-health-card">
          <div className="health-header">
            <div className="health-title-group">
              <AlertTriangle size={16} className="health-icon amber" />
              <span className="health-title">Problem Resolution Rate</span>
            </div>
            <span className="health-rate">{snagResolutionRate}%</span>
          </div>

          <div className="progress-bar-track">
            <div
              className="progress-bar-fill fill-amber"
              style={{ width: `${snagResolutionRate}%` }}
            />
          </div>

          <div className="breakdown-stats">
            <div className="stat-item">
              <span className="stat-label">Total Problems</span>
              <span className="stat-val">{metrics.totalSnags}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Open</span>
              <span className="stat-val accent-amber">{metrics.openSnags}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Resolved</span>
              <span className="stat-val accent-green">{metrics.resolvedSnags}</span>
            </div>
          </div>
        </div>

        {/* Tasks Breakdown */}
        <div className="status-health-card">
          <div className="health-header">
            <div className="health-title-group">
              <CheckCircle2 size={16} className="health-icon green" />
              <span className="health-title">Task Completion Rate</span>
            </div>
            <span className="health-rate">{taskCompletionRate}%</span>
          </div>

          <div className="progress-bar-track">
            <div
              className="progress-bar-fill fill-cyan"
              style={{ width: `${taskCompletionRate}%` }}
            />
          </div>

          <div className="breakdown-stats">
            <div className="stat-item">
              <span className="stat-label">Total Tasks</span>
              <span className="stat-val">{metrics.totalTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Pending</span>
              <span className="stat-val accent-cyan">{metrics.pendingTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Overdue</span>
              <span className={`stat-val ${overdueCount > 0 ? 'accent-rose' : ''}`}>
                {overdueCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team / Contractor List */}
      <div className="status-section-block">
        <div className="section-header-row">
          <div className="section-title-wrap">
            <Users size={16} className="section-icon" />
            <h2 className="status-section-heading">Contractors & Site Team</h2>
          </div>
          <span className="section-badge-counter">{team.length} Registered</span>
        </div>

        <div className="registry-table-container">
          <table className="clean-data-table">
            <thead>
              <tr>
                <th className="th-assignee">Contractor / Name</th>
                <th className="th-title">Role</th>
                <th className="th-prio">Assigned Problems</th>
                <th className="th-status">Assigned Tasks</th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-empty-msg">
                    No trade contractors registered for this project.
                  </td>
                </tr>
              ) : (
                team.map((member) => {
                  const assignedSnagCount = snags.filter(
                    (s) => s.assigneeId?._id === member._id || s.assigneeId?.name === member.name
                  ).length;
                  const assignedTaskCount = tasks.filter(
                    (t) => t.assigneeId?._id === member._id || t.assigneeId?.name === member.name
                  ).length;

                  return (
                    <tr key={member._id} className="data-table-row">
                      <td className="cell-assignee">
                        <span className="assignee-label">{member.name}</span>
                      </td>
                      <td className="cell-title">
                        <span className="role-tag">{member.role}</span>
                      </td>
                      <td className="cell-prio">
                        <span className={`count-tag ${assignedSnagCount > 0 ? 'has-count' : ''}`}>
                          {assignedSnagCount}
                        </span>
                      </td>
                      <td className="cell-status">
                        <span className={`count-tag ${assignedTaskCount > 0 ? 'has-count' : ''}`}>
                          {assignedTaskCount}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProjectStatusView;
