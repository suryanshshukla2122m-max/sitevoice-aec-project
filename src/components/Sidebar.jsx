import React from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  CheckSquare,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import { SiteVoiceLogoIcon } from './SiteVoiceLogo';

export function Sidebar({
  activeTab,
  onTabChange,
  snagCount = 0,
  taskCount = 0,
  selectedProject,
  projects = [],
  onSelectProject,
  isOpenMobile,
  onCloseMobile,
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'snags', label: 'Problems (Snags)', icon: AlertTriangle, count: snagCount },
    { id: 'tasks', label: 'Work to Do (Tasks)', icon: CheckSquare, count: taskCount },
    { id: 'status', label: 'Project Summary', icon: BarChart3 },
  ];

  const handleNavClick = (id) => {
    onTabChange(id);
    if (onCloseMobile) onCloseMobile();
  };

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
        {/* Top: App Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <SiteVoiceLogoIcon size={20} />
          </div>
          <div className="sidebar-brand-text">
            <span className="brand-name">SiteVoice</span>
            <span className="brand-badge-pill">AEC</span>
          </div>
        </div>

        {/* Project Selector (Below brand) */}
        <div className="sidebar-project-selector">
          <label htmlFor="sidebar-project-select" className="selector-label">
            Active Project
          </label>
          <div className="selector-select-wrapper">
            <select
              id="sidebar-project-select"
              className="selector-select"
              value={selectedProject?._id || ''}
              onChange={(e) => {
                const found = projects.find((p) => p._id === e.target.value);
                if (found) onSelectProject(found);
              }}
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="selector-arrow" aria-hidden="true" />
          </div>
        </div>

        {/* Navigation items */}
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

        {/* Bottom of sidebar: Clean status indicator */}
        <div className="sidebar-footer">
          <div className="sidebar-status-pill">
            <span className="status-indicator-dot" />
            <span className="status-indicator-text">System Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
