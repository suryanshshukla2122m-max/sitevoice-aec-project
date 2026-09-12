import React from 'react';
import { Menu, Volume2, VolumeX } from 'lucide-react';

export function Header({
  activeTab = 'overview',
  isMuted = false,
  onToggleMute,
  onOpenMobileMenu,
}) {
  const pageTitles = {
    overview: 'Overview',
    snags: 'Problems (Snags)',
    tasks: 'Work to Do (Tasks)',
    status: 'Project Summary',
  };

  const pageTitle = pageTitles[activeTab] || 'Overview';

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

        {/* Current page title ONLY */}
        <h1 className="header-page-title">{pageTitle}</h1>
      </div>

      <div className="header-right">
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
      </div>
    </header>
  );
}

export default Header;
