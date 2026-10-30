import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Volume2,
  VolumeX,
  Plus,
  Building2,
  ChevronDown,
  LogOut,
  User,
  Layers,
  Check,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { SiteVoiceLogoIcon } from './SiteVoiceLogo';

export function Header({
  isMuted = false,
  onToggleMute,
  onOpenMobileMenu,
  selectedProject,
  projects = [],
  onSelectProject,
  currentUser,
  onOpenLoginModal,
  onNavigateToProfile,
  onNavigateToHome,
  onLogout,
  onOpenCreateSnag,
  onOpenCreateTask,
}) {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const projectDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const isWorker =
    currentUser &&
    currentUser.role !== 'Admin' &&
    currentUser.role !== 'Project Manager';

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(event.target)
      ) {
        setIsProjectDropdownOpen(false);
      }
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setIsProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectProj = (proj) => {
    if (onSelectProject) {
      onSelectProject(proj);
    }
    setIsProjectDropdownOpen(false);
  };

  const handleGoToProfile = () => {
    setIsProfileDropdownOpen(false);
    if (onNavigateToProfile) {
      onNavigateToProfile();
    }
  };

  const handleSwitchDemoAccount = () => {
    setIsProfileDropdownOpen(false);
    if (onOpenLoginModal) {
      onOpenLoginModal();
    }
  };

  const handleSignOut = () => {
    setIsProfileDropdownOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const hasMultipleProjects = projects.length > 1;

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Mobile menu trigger */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        {/* SiteVoice AEC Brand Identity */}
        <button
          type="button"
          className="header-brand-btn"
          onClick={onNavigateToHome}
          title="Return to Dashboard"
          aria-label="SiteVoice AEC Dashboard"
        >
          <div className="header-brand-icon">
            <SiteVoiceLogoIcon size={18} />
          </div>
          <div className="header-brand-text">
            <span className="brand-name">SiteVoice</span>
            <span className="brand-badge-pill">AEC</span>
          </div>
        </button>

        <div className="header-brand-divider" aria-hidden="true" />

        {/* Dedicated Project Selector Dropdown */}
        <div className="header-project-selector" ref={projectDropdownRef}>
          {hasMultipleProjects ? (
            <button
              type="button"
              className={`header-project-btn ${isProjectDropdownOpen ? 'is-active' : ''}`}
              onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
              aria-expanded={isProjectDropdownOpen}
              aria-haspopup="listbox"
              title="Click to switch active project"
            >
              <div className="project-icon-box">
                <Building2 size={15} />
              </div>
              <div className="project-info-stack">
                <span className="project-heading-label">Active Project</span>
                <span className="project-current-name">
                  {selectedProject?.name || 'Select Project'}
                </span>
              </div>
              {selectedProject?.code && (
                <span className="project-code-badge">{selectedProject.code}</span>
              )}
              <ChevronDown
                size={14}
                className={`dropdown-chevron ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
          ) : (
            <div
              className="header-project-btn is-single"
              title={`Assigned Project: ${selectedProject?.name || 'Project'}`}
            >
              <div className="project-icon-box">
                <Building2 size={15} />
              </div>
              <div className="project-info-stack">
                <span className="project-heading-label">Assigned Project</span>
                <span className="project-current-name">
                  {selectedProject?.name || 'Site Project'}
                </span>
              </div>
              {selectedProject?.code && (
                <span className="project-code-badge">{selectedProject.code}</span>
              )}
            </div>
          )}

          {/* Project Dropdown Menu */}
          {isProjectDropdownOpen && hasMultipleProjects && (
            <div className="project-dropdown-menu" role="listbox">
              <div className="dropdown-section-title">Authorized Site Projects</div>
              <div className="dropdown-projects-list">
                {projects.map((proj) => {
                  const isSelected = selectedProject?._id === proj._id;
                  return (
                    <button
                      key={proj._id}
                      type="button"
                      className={`project-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleSelectProj(proj)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="proj-item-details">
                        <div className="proj-item-name-row">
                          <span className="item-proj-name">{proj.name}</span>
                          {proj.code && (
                            <span className="item-proj-code">{proj.code}</span>
                          )}
                        </div>
                        {proj.location && (
                          <span className="item-proj-loc">{proj.location}</span>
                        )}
                      </div>
                      {isSelected && (
                        <Check size={15} className="item-check-icon" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Quick action buttons */}
        <div className="header-quick-actions">
          {onOpenCreateSnag && (
            <button
              type="button"
              className="header-btn-action-snag"
              onClick={onOpenCreateSnag}
              title="Report a new site problem"
            >
              <Plus size={14} />
              <span>Report a Problem</span>
            </button>
          )}

          {!isWorker && onOpenCreateTask && (
            <button
              type="button"
              className="header-btn-action-task"
              onClick={onOpenCreateTask}
              title="Create a new task"
            >
              <Plus size={14} />
              <span>Create Task</span>
            </button>
          )}
        </div>

        {/* Audio feedback mute toggle */}
        <button
          type="button"
          className={`audio-btn ${isMuted ? 'is-muted' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute voice feedback' : 'Mute voice feedback'}
          aria-label={isMuted ? 'Unmute voice feedback' : 'Mute voice feedback'}
        >
          {isMuted ? (
            <VolumeX size={16} aria-hidden="true" />
          ) : (
            <Volume2 size={16} aria-hidden="true" />
          )}
        </button>

        {/* User Account / Profile Dropdown */}
        <div className="header-user-section" ref={profileDropdownRef}>
          <button
            type="button"
            className={`header-user-pill-btn ${isProfileDropdownOpen ? 'is-active' : ''}`}
            onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
            aria-expanded={isProfileDropdownOpen}
            aria-haspopup="menu"
            title="User Account & Options"
          >
            <div className="user-avatar-circle">{userInitials}</div>
            <div className="user-details-col">
              <span className="user-name-text">{currentUser?.name || 'Sign In'}</span>
              <span className="user-role-label">{currentUser?.role || 'AEC Team'}</span>
            </div>
            <ChevronDown
              size={13}
              className={`user-arrow ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* User Profile Popover Menu */}
          {isProfileDropdownOpen && (
            <div className="user-profile-menu" role="menu">
              {/* Profile Card Header */}
              <div className="profile-menu-header">
                <div className="menu-user-row">
                  <div className="menu-avatar-circle">{userInitials}</div>
                  <div className="menu-user-info">
                    <span className="menu-user-name">{currentUser?.name || 'User'}</span>
                    <span className="menu-user-email">{currentUser?.email || ''}</span>
                  </div>
                </div>

                <div className="menu-meta-row">
                  <span className="menu-role-tag">{currentUser?.role || 'Team Member'}</span>
                  {currentUser?.company && (
                    <span className="menu-company-tag">{currentUser.company}</span>
                  )}
                </div>

                <div className="menu-projects-summary">
                  <Building2 size={12} />
                  <span>
                    {currentUser?.role === 'Admin'
                      ? 'Universal Access (All Projects)'
                      : `${projects.length} Assigned ${projects.length === 1 ? 'Project' : 'Projects'}`}
                  </span>
                </div>
              </div>

              <div className="profile-menu-divider" />

              {/* Navigation Actions */}
              <div className="profile-menu-items">
                <button
                  type="button"
                  className="profile-menu-action-item"
                  onClick={handleGoToProfile}
                  role="menuitem"
                >
                  <User size={15} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  className="profile-menu-action-item highlight"
                  onClick={handleSwitchDemoAccount}
                  role="menuitem"
                >
                  <Layers size={15} />
                  <div className="menu-action-col">
                    <span>Switch Demo Account (Presentation)</span>
                    <span className="menu-action-sub">Test Admin, Manager & Contractor roles</span>
                  </div>
                </button>
              </div>

              <div className="profile-menu-divider" />

              {/* Sign Out Action */}
              <div className="profile-menu-footer">
                <button
                  type="button"
                  className="profile-menu-logout-item"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
