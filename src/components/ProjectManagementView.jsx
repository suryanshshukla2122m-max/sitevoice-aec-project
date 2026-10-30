import React, { useState } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  Edit2,
  Trash2,
  ArrowRight,
  TrendingUp,
  Search,
  Filter,
} from 'lucide-react';

export function ProjectManagementView({
  projects = [],
  isLoading = false,
  currentUser,
  selectedProject,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  users = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    fullName: '',
    location: '',
    description: '',
    budget: '',
    status: 'Active',
    managerId: '',
  });

  const isAdmin = currentUser?.role === 'Admin';
  const isPM = currentUser?.role === 'Project Manager';

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    if (statusFilter !== 'ALL' && project.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = project.name?.toLowerCase().includes(q);
      const matchCode = project.code?.toLowerCase().includes(q);
      const matchLoc = project.location?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchLoc) return false;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: '',
      fullName: '',
      location: '',
      description: '',
      budget: '',
      status: 'Active',
      managerId: '',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (project, e) => {
    e.stopPropagation();
    setEditingProject(project);
    setFormData({
      name: project.name || '',
      code: project.code || '',
      fullName: project.fullName || '',
      location: project.location || '',
      description: project.description || '',
      budget: project.budget || '',
      status: project.status || 'Active',
      managerId: project.managerId?._id || project.managerId || '',
    });
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingProject) {
        await onUpdateProject(editingProject._id, formData);
        setEditingProject(null);
      } else {
        await onCreateProject(formData);
        setIsCreateOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectManagers = users.filter((u) => u.role === 'Project Manager' || u.role === 'Admin');

  return (
    <div className="registry-page-view" role="region" aria-label="Projects">
      {/* Standard Page Header */}
      <div className="registry-page-header">
        <div>
          <h1 className="registry-main-title">{isAdmin ? 'Projects' : 'My Projects'}</h1>
          <p className="registry-main-subtitle">
            {isAdmin
              ? 'Manage all construction site projects, assign team managers, and track milestones.'
              : 'Projects assigned to your management portfolio for site execution.'}
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn-create-record"
            onClick={handleOpenCreate}
            aria-label="Create a new project"
          >
            <Plus size={16} />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="projects-toolbar">
        <div className="projects-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search projects by name, code, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="projects-search-input"
          />
        </div>

        <div className="projects-status-filters">
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Projects ({projects.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'Active' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('Active')}
          >
            Active ({projects.filter((p) => p.status === 'Active').length})
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'On Hold' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('On Hold')}
          >
            On Hold ({projects.filter((p) => p.status === 'On Hold').length})
          </button>
          <button
            type="button"
            className={`filter-btn ${statusFilter === 'Completed' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('Completed')}
          >
            Completed ({projects.filter((p) => p.status === 'Completed').length})
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="projects-loading-state">
          <div className="loading-spinner" />
          <p>Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="projects-empty-state">
          <Building2 size={40} className="empty-icon" />
          <h3>No projects found</h3>
          <p>
            {searchQuery
              ? `No projects match "${searchQuery}".`
              : 'No projects currently in database.'}
          </p>
        </div>
      ) : (
        <div className="projects-cards-grid">
          {filteredProjects.map((project) => {
            const isSelected = selectedProject?._id === project._id;
            const stats = project.stats || {
              totalTasks: 0,
              pendingTasks: 0,
              completedTasks: 0,
              openProblems: 0,
              progressPct: 0,
            };

            return (
              <div
                key={project._id}
                className={`project-management-card ${isSelected ? 'is-active-project' : ''}`}
                onClick={() => onSelectProject(project)}
              >
                {/* Card Top */}
                <div className="project-card-header">
                  <div className="project-badge-row">
                    <span className="project-code-badge">{project.code || 'PRJ'}</span>
                    <span
                      className={`project-status-pill status-${(project.status || 'Active')
                        .toLowerCase()
                        .replace(' ', '-')}`}
                    >
                      {project.status || 'Active'}
                    </span>
                    {isSelected && <span className="active-selection-pill">Selected</span>}
                  </div>

                  {isAdmin && (
                    <div className="project-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-icon-action"
                        title="Edit Project"
                        onClick={(e) => handleOpenEdit(project, e)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-action text-red"
                        title="Delete Project"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Are you sure you want to delete project "${project.name}" and all its records?`
                            )
                          ) {
                            onDeleteProject(project._id);
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Titles */}
                <h3 className="project-card-title">{project.name}</h3>
                <div className="project-card-location">
                  <MapPin size={13} className="loc-icon" />
                  <span>{project.location}</span>
                </div>

                {project.description && (
                  <p className="project-card-desc">{project.description}</p>
                )}

                {/* Budget & Manager */}
                <div className="project-card-details">
                  {project.budget && (
                    <div className="detail-item">
                      <span className="detail-label">Budget:</span>
                      <span className="detail-value">{project.budget}</span>
                    </div>
                  )}
                  {project.managerId && (
                    <div className="detail-item">
                      <span className="detail-label">Manager:</span>
                      <span className="detail-value">
                        {typeof project.managerId === 'object'
                          ? project.managerId.name
                          : 'Assigned'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="project-progress-block">
                  <div className="progress-label-row">
                    <span>Task Completion</span>
                    <span className="progress-num">{stats.progressPct}%</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(100, stats.progressPct)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Counters */}
                <div className="project-stats-footer">
                  <div className="project-stat-pill">
                    <ClipboardList size={13} />
                    <span>
                      {stats.completedTasks} / {stats.totalTasks} Tasks Done
                    </span>
                  </div>
                  <div
                    className={`project-stat-pill ${stats.openProblems > 0 ? 'has-problems' : ''}`}
                  >
                    <AlertTriangle size={13} />
                    <span>{stats.openProblems} Open Problems</span>
                  </div>
                </div>

                {/* Bottom Trigger */}
                <div className="project-card-select-btn">
                  <span>{isSelected ? 'Currently Viewing Workspace' : 'Switch Workspace to This Project'}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal Dialog */}
      {(isCreateOpen || editingProject) && (
        <div className="sitevoice-modal-backdrop" onClick={() => { setIsCreateOpen(false); setEditingProject(null); }}>
          <div className="sitevoice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProject ? 'Edit Construction Project' : 'Create New Construction Project'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => { setIsCreateOpen(false); setEditingProject(null); }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="modal-form">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Valley Apartments, Phase 2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Project Code</label>
                  <input
                    type="text"
                    placeholder="e.g. GVA-102"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Site Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 62, Golf Course Ext, Gurgaon"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Project Budget</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹55.0 Cr"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Project Manager</label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Unassigned</option>
                    {projectManagers.map((pm) => (
                      <option key={pm._id} value={pm._id}>
                        {pm.name} ({pm.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Project Scope / Description</label>
                <textarea
                  rows={3}
                  placeholder="High-level description of construction scope, tower count, and key milestones..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-textarea"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => { setIsCreateOpen(false); setEditingProject(null); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingProject
                    ? 'Save Changes'
                    : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectManagementView;
