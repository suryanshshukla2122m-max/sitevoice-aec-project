import React, { useState } from 'react';
import { Shield, User, Key, ArrowRight, Check } from 'lucide-react';
import { SiteVoiceLogoIcon } from './SiteVoiceLogo';

export function LoginModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onQuickSwitch,
  isSubmitting,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const demoAccounts = [
    {
      name: 'Aditya Singhania',
      role: 'Admin',
      email: 'admin@sitevoice.com',
      badge: 'Full Admin Access (All Projects)',
    },
    {
      name: 'Priya Mehta',
      role: 'Project Manager',
      email: 'priya@sitevoice.com',
      badge: 'Manager: Skyline & Green Valley',
    },
    {
      name: 'BrightSpark Electricals',
      role: 'Electrical Contractor',
      email: 'brightspark@sitevoice.com',
      badge: 'Contractor: Dedicated "My Work"',
    },
    {
      name: 'BuildCraft Civil',
      role: 'Civil Contractor',
      email: 'buildcraft@sitevoice.com',
      badge: 'Contractor: Foundations & Facade',
    },
    {
      name: 'Rahul Sharma',
      role: 'Site Engineer',
      email: 'rahul@sitevoice.com',
      badge: 'Field Engineer: Inspections',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await onLogin({ email, password });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Login failed.');
    }
  };

  const handleQuickSelect = async (account) => {
    setErrorMsg('');
    try {
      await onQuickSwitch(account);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Quick switch failed.');
    }
  };

  return (
    <div className="sitevoice-modal-backdrop" onClick={onClose}>
      <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <div className="login-brand-icon">
            <SiteVoiceLogoIcon size={24} />
          </div>
          <h2 className="login-modal-title">Sign In to SiteVoice AEC</h2>
          <p className="login-modal-subtitle">
            Access your role-specific dashboard: Administrator, Project Manager, or Contractor "My Work".
          </p>
        </div>

        {errorMsg && <div className="login-error-banner">{errorMsg}</div>}

        {/* Quick Demo Switcher Section (Ideal for presentations) */}
        <div className="quick-switch-section">
          <div className="quick-switch-header">
            <span>Quick Presentation Login (1-Click Switch)</span>
          </div>

          <div className="quick-accounts-list">
            {demoAccounts.map((acc) => {
              const isCurrent = currentUser?.email === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  className={`quick-account-btn ${isCurrent ? 'is-current' : ''}`}
                  onClick={() => handleQuickSelect(acc)}
                  disabled={isSubmitting}
                >
                  <div className="quick-account-info">
                    <div className="quick-account-name-row">
                      <span className="account-name">{acc.name}</span>
                      <span className="account-role-tag">{acc.role}</span>
                    </div>
                    <span className="account-badge-desc">{acc.badge}</span>
                  </div>
                  {isCurrent ? (
                    <span className="current-indicator">
                      <Check size={14} /> Active
                    </span>
                  ) : (
                    <ArrowRight size={14} className="arrow-icon" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="login-divider">
          <span>or sign in with credentials</span>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <User size={15} className="input-icon" />
              <input
                type="email"
                required
                placeholder="e.g. admin@sitevoice.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input has-icon"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Key size={15} className="input-icon" />
              <input
                type="password"
                required
                placeholder="Default: admin123 / pm123 / contractor123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input has-icon"
              />
            </div>
          </div>

          <div className="login-actions">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;
