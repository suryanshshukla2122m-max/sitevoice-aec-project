import React from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Building2,
  MapPin,
  Users,
} from 'lucide-react';

export function ProjectStatusView({ project, summary, snags = [], tasks = [], isLoading }) {
  const metrics = summary?.metrics || {
    totalSnags: snags.length || 0,
    openSnags: snags.filter((s) => s.status === 'Open').length || 0,
    resolvedSnags: snags.filter((s) => ['Resolved', 'Closed'].includes(s.status)).length || 0,
    totalTasks: tasks.length || 0,
    pendingTasks: tasks.filter((t) => t.status === 'Pending').length || 0,
    completedTasks: tasks.filter((t) => t.status === 'Completed').length || 0,
    overdueTasks: 0,
  };

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
    <div className="registry-page-view" role="region" aria-label="Project Summary">
      {/* Top Header */}
      <div className="registry-page-header">
        <h1 className="registry-main-title">Project Summary</h1>
        <p className="registry-main-subtitle">
          Health and trade contractor execution for {project?.name || 'Skyline Residence'}
        </p>
      </div>

      {/* Health Breakdown Cards */}
      <div className="status-metrics-row">
        {/* Snags Breakdown */}
        <div className="status-health-card">
          <div className="health-header">
            <span className="health-title">Defect Resolution</span>
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
              <span className="stat-label">Total Snags</span>
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
            <span className="health-title">Task Execution</span>
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
              <span className={`stat-val ${metrics.overdueTasks > 0 ? 'accent-rose' : ''}`}>
                {metrics.overdueTasks}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team / Trade Contractor List */}
      <div className="status-section-block">
        <h2 className="status-section-heading">Trade Contractors & Field Roster</h2>
        <div className="registry-table-container">
          <table className="clean-data-table">
            <thead>
              <tr>
                <th className="th-assignee">Name</th>
                <th className="th-title">Trade Role</th>
                <th className="th-prio">Assigned Snags</th>
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
                      <td className="cell-title">{member.role}</td>
                      <td className="cell-prio">{assignedSnagCount}</td>
                      <td className="cell-status">{assignedTaskCount}</td>
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
