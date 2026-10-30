import React from 'react';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Layers,
  Calendar,
} from 'lucide-react';

export function UserProfileView({
  currentUser,
  projects = [],
  onOpenLoginModal,
  onLogout,
}) {
  const isAdmin = currentUser?.role === 'Admin';
  const isPM = currentUser?.role === 'Project Manager';

  // Assigned projects
  const assignedProjects = isAdmin
    ? projects
    : currentUser?.assignedProjects || [];

  return (
    <div className="registry-page-view" role="region" aria-label="My Profile">
      {/* Standard Page Header */}
      <div className="registry-page-header">
        <div>
          <h1 className="registry-main-title">My Profile</h1>
          <p className="registry-main-subtitle">
            Account identity, role credentials, and active project assignments
          </p>
        </div>
      </div>

      <div className="profile-view-layout">
        {/* Profile Card */}
        <div className="profile-info-card">
          <div className="profile-avatar-row">
            <div className="profile-avatar-large">
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'U'}
            </div>
            <div className="profile-names">
              <h2 className="profile-fullname">{currentUser?.name || 'Authenticated User'}</h2>
              <div className="profile-role-badge">
                <ShieldCheck size={14} />
                <span>{currentUser?.role || 'AEC Team'}</span>
              </div>
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="profile-detail-item">
              <span className="detail-item-label">
                <Mail size={14} />
                <span>Email Address</span>
              </span>
              <span className="detail-item-value">{currentUser?.email || 'N/A'}</span>
            </div>

            <div className="profile-detail-item">
              <span className="detail-item-label">
                <Briefcase size={14} />
                <span>Company / Trade</span>
              </span>
              <span className="detail-item-value">
                {currentUser?.company || (isAdmin ? 'Site Management Authority' : 'Independent Contractor')}
              </span>
            </div>

            {currentUser?.phone && (
              <div className="profile-detail-item">
                <span className="detail-item-label">
                  <Phone size={14} />
                  <span>Phone Number</span>
                </span>
                <span className="detail-item-value">{currentUser.phone}</span>
              </div>
            )}

            <div className="profile-detail-item">
              <span className="detail-item-label">
                <CheckCircle2 size={14} />
                <span>Account Status</span>
              </span>
              <span className="detail-item-value text-green">Active & Verified</span>
            </div>
          </div>

          {/* Quick Profile Actions */}
          <div className="profile-actions-row">
            {onOpenLoginModal && (
              <button
                type="button"
                className="profile-btn-switch"
                onClick={onOpenLoginModal}
              >
                <Layers size={15} />
                <span>Switch Demo Account (Presentation)</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                className="profile-btn-logout"
                onClick={onLogout}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Assigned Projects Card */}
        <div className="profile-projects-card">
          <div className="card-heading-row">
            <Building2 size={18} className="heading-icon" />
            <h3 className="card-heading-text">Project Assignments</h3>
          </div>

          <p className="card-sub-text">
            {isAdmin
              ? 'As a System Administrator, you have full access across all active construction sites.'
              : isPM
              ? 'Projects assigned to you for construction supervision, scheduling, and inspections.'
              : 'Site projects where tasks or problems are assigned to your contractor firm.'}
          </p>

          <div className="assigned-projects-list">
            {assignedProjects.length === 0 ? (
              <div className="projects-empty-hint">No projects currently assigned to this account.</div>
            ) : (
              assignedProjects.map((p) => {
                const projObj = typeof p === 'object' ? p : { _id: p, name: 'Assigned Project' };
                return (
                  <div key={projObj._id} className="assigned-project-item">
                    <div className="proj-item-main">
                      <span className="proj-item-name">{projObj.name}</span>
                      <span className="proj-item-loc">{projObj.location || 'Site Location'}</span>
                    </div>
                    {projObj.code && <span className="proj-code-badge">{projObj.code}</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileView;
