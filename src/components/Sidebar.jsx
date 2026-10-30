import React from 'react';
import {
  Home,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  Users,
  CheckCircle2,
  FolderKanban,
  User,
  ShieldCheck,
} from 'lucide-react';
import { SiteVoiceLogoIcon } from './SiteVoiceLogo';

export function Sidebar({
  activeTab,
  onTabChange,
  snagCount = 0,
  taskCount = 0,
  myWorkCount = 0,
  reportedProblemsCount = 0,
  projectCount = 0,
  teamCount = 0,
  currentUser,
  isOpenMobile,
  onCloseMobile,
}) {
  const isAdmin = currentUser?.role === 'Admin';
  const isPM = currentUser?.role === 'Project Manager';
  const isWorker = !isAdmin && !isPM;

  // Build role-tailored navigation items
  let navItems = [];

  if (isWorker) {
    // Worker / Contractor Panel:
    // 1. My Work
    // 2. Problems I Reported
    // 3. My Profile
    navItems = [
      { id: 'mywork', label: 'My Work', icon: CheckCircle2, count: myWorkCount },
      { id: 'reported_problems', label: 'Problems I Reported', icon: AlertTriangle, count: reportedProblemsCount },
      { id: 'profile', label: 'My Profile', icon: User },
    ];
  } else if (isPM) {
    // Project Manager Panel:
    // 1. Dashboard
    // 2. My Projects
    // 3. Problems
    // 4. Tasks
    // 5. Team
    // 6. Project Status
    navItems = [
      { id: 'overview', label: 'Dashboard', icon: Home },
      { id: 'projects', label: 'My Projects', icon: FolderKanban, count: projectCount },
      { id: 'snags', label: 'Problems', icon: AlertTriangle, count: snagCount },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList, count: taskCount },
      { id: 'team', label: 'Team', icon: Users },
      { id: 'status', label: 'Project Status', icon: BarChart3 },
    ];
  } else {
    // Admin Panel:
    // 1. Dashboard
    // 2. Projects
    // 3. Problems
    // 4. Tasks
    // 5. Team
    // 6. Project Status
    navItems = [
      { id: 'overview', label: 'Dashboard', icon: Home },
      { id: 'projects', label: 'Projects', icon: FolderKanban, count: projectCount },
      { id: 'snags', label: 'Problems', icon: AlertTriangle, count: snagCount },
      { id: 'tasks', label: 'Tasks', icon: ClipboardList, count: taskCount },
      { id: 'team', label: 'Team', icon: Users, count: teamCount },
      { id: 'status', label: 'Project Status', icon: BarChart3 },
    ];
  }

  const handleNavClick = (id) => {
    onTabChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpenMobile && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${isOpenMobile ? 'is-open-mobile' : ''}`}>
        {/* Mobile-only header with close button */}
        <div className="sidebar-mobile-header">
          <div className="sidebar-brand-text">
            <SiteVoiceLogoIcon size={18} />
            <span className="brand-name">SiteVoice</span>
            <span className="brand-badge-pill">AEC</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Desktop Navigation Section Label */}
        <div className="sidebar-section-header">
          <span className="sidebar-section-label">Main Menu</span>
        </div>

        {/* Navigation items (Middle scrollable area) */}
        <nav className="sidebar-nav" aria-label="Main Navigation">
          <div className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} className="nav-icon" aria-hidden="true" />
                  <span className="nav-label">{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="nav-counter">{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom of sidebar: Logged-in User Profile Card */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-user-card-btn"
            onClick={() => handleNavClick('profile')}
            title="View My Profile"
          >
            <div className="sidebar-user-avatar">{userInitials}</div>
            <div className="user-text-col">
              <span className="footer-user-name">{currentUser?.name || 'AEC User'}</span>
              <span className="footer-user-role">{currentUser?.role || 'Team Member'}</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
