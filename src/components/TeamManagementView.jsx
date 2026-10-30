import React, { useState } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Search,
  Filter,
} from 'lucide-react';

export function TeamManagementView({
  users = [],
  projects = [],
  tasks = [],
  currentUser,
  onCreateUser,
  onUpdateUser,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Electrical Contractor',
    phone: '',
    company: '',
    assignedProjects: [],
  });

  const isAdmin = currentUser?.role === 'Admin';

  const roleCategories = [
    'Admin',
    'Project Manager',
    'Site Engineer',
    'Electrical Contractor',
    'Plumbing Contractor',
    'False-Ceiling Contractor',
    'Civil Contractor',
    'HVAC Contractor',
  ];

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL') {
      if (roleFilter === 'Contractors') {
        if (!u.role?.includes('Contractor')) return false;
      } else if (u.role !== roleFilter) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchRole = u.role?.toLowerCase().includes(q);
      const matchComp = u.company?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRole && !matchComp) return false;
    }

    return true;
  });

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Electrical Contractor',
      phone: '',
      company: '',
      assignedProjects: projects.length > 0 ? [projects[0]._id] : [],
    });
    setIsCreateOpen(true);
  };

  const handleToggleProject = (projId) => {
    setFormData((prev) => {
      const exists = prev.assignedProjects.includes(projId);
      return {
        ...prev,
        assignedProjects: exists
          ? prev.assignedProjects.filter((id) => id !== projId)
          : [...prev.assignedProjects, projId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateUser(formData);
      setIsCreateOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="registry-page-view" role="region" aria-label="Team">
      {/* Standard Page Header */}
      <div className="registry-page-header">
        <div>
          <h1 className="registry-main-title">Team</h1>
          <p className="registry-main-subtitle">
            Engineers, contractors, project managers, and their construction project assignments
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn-create-record"
            onClick={handleOpenCreate}
            aria-label="Add a new team member"
          >
            <Plus size={16} />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="team-toolbar">
        <div className="team-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search team members by name, trade, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="team-search-input"
          />
        </div>

        <div className="team-role-filters">
          <button
            type="button"
            className={`filter-btn ${roleFilter === 'ALL' ? 'is-active' : ''}`}
            onClick={() => setRoleFilter('ALL')}
          >
            All Members ({users.length})
          </button>
          <button
            type="button"
            className={`filter-btn ${roleFilter === 'Project Manager' ? 'is-active' : ''}`}
            onClick={() => setRoleFilter('Project Manager')}
          >
            Managers
          </button>
          <button
            type="button"
            className={`filter-btn ${roleFilter === 'Site Engineer' ? 'is-active' : ''}`}
            onClick={() => setRoleFilter('Site Engineer')}
          >
            Engineers
          </button>
          <button
            type="button"
            className={`filter-btn ${roleFilter === 'Contractors' ? 'is-active' : ''}`}
            onClick={() => setRoleFilter('Contractors')}
          >
            Contractors
          </button>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="team-cards-grid">
        {filteredUsers.map((member) => {
          // Count tasks assigned to this user
          const assignedTasks = tasks.filter(
            (t) => String(t.assigneeId?._id || t.assigneeId) === String(member._id)
          );
          const activeTasks = assignedTasks.filter((t) => t.status !== 'Completed');

          return (
            <div key={member._id} className="team-member-card">
              <div className="member-card-top">
                <div className="member-avatar-initials">
                  {member.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="member-info-col">
                  <h3 className="member-name">{member.name}</h3>
                  <span className={`member-role-badge role-${member.role?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {member.role}
                  </span>
                </div>
              </div>

              {member.company && (
                <div className="member-company">
                  <Briefcase size={13} className="meta-icon" />
                  <span>{member.company}</span>
                </div>
              )}

              <div className="member-contacts">
                {member.email && (
                  <div className="contact-row">
                    <Mail size={13} className="meta-icon" />
                    <span>{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="contact-row">
                    <Phone size={13} className="meta-icon" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              {/* Assigned Projects */}
              <div className="member-projects-box">
                <div className="box-label">
                  <Building2 size={12} />
                  <span>Assigned Projects:</span>
                </div>
                <div className="projects-tags-wrap">
                  {member.role === 'Admin' ? (
                    <span className="proj-tag is-all">All Site Projects (Universal)</span>
                  ) : member.assignedProjects && member.assignedProjects.length > 0 ? (
                    member.assignedProjects.map((p) => (
                      <span key={p._id || p} className="proj-tag">
                        {p.name || 'Project'}
                      </span>
                    ))
                  ) : (
                    <span className="proj-tag is-unassigned">None assigned</span>
                  )}
                </div>
              </div>

              {/* Active Tasks Pill */}
              <div className="member-task-stat">
                <ClipboardList size={13} />
                <span>
                  {activeTasks.length} Active {activeTasks.length === 1 ? 'Task' : 'Tasks'} ({assignedTasks.length} Total)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Member Modal */}
      {isCreateOpen && (
        <div className="sitevoice-modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="sitevoice-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Team Member or Contractor</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name / Contractor Firm *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Ceilings or Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rahul@sitevoice.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Trade *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="form-select"
                  >
                    {roleCategories.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Interior Finishes Pvt Ltd"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98100 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign to Projects</label>
                <div className="project-checkboxes-grid">
                  {projects.map((proj) => {
                    const isChecked = formData.assignedProjects.includes(proj._id);
                    return (
                      <label key={proj._id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProject(proj._id)}
                        />
                        <span>{proj.name} ({proj.code || 'PRJ'})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamManagementView;
