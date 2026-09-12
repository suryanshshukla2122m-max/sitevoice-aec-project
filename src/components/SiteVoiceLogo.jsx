import React from 'react';

/**
 * SiteVoice AEC Custom Brand Logo
 * Concept: Voice/Communication (sound modulation pillars) + Construction/Building (architectural frame & datum)
 * Colors: Primary Soft Slate Blue (#526581) with subtle Muted Warm Amber accent (#D69A3A)
 */
export function SiteVoiceLogoIcon({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="SiteVoice AEC Logo"
      role="img"
    >
      {/* Architectural Roof / Structural Truss */}
      <path
        d="M5 12.5L16 5.5L27 12.5"
        stroke="#526581"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Acoustic Voice Modulation Columns (Structural Pillars) */}
      {/* Pillar 1 */}
      <rect x="7" y="14" width="3" height="10" rx="1.5" fill="#526581" />
      {/* Pillar 2 */}
      <rect x="12" y="10" width="3" height="14" rx="1.5" fill="#526581" />
      {/* Pillar 3 */}
      <rect x="17" y="8.5" width="3" height="15.5" rx="1.5" fill="#526581" />
      {/* Pillar 4 */}
      <rect x="22" y="13.5" width="3" height="10.5" rx="1.5" fill="#526581" />

      {/* Subtle Construction Apex / Surveyor Datum Accent */}
      <circle cx="16" cy="5.5" r="2" fill="#D69A3A" />

      {/* Structural Foundation Beam */}
      <path
        d="M5 26.5H27"
        stroke="#526581"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default SiteVoiceLogoIcon;
