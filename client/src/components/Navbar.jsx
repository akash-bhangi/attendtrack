import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePwaInstall } from '../utils/usePwaInstall';
import IosInstallModal from './IosInstallModal';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, theme, toggleTheme } = useAuth();
  const { isInstallable, showIOSPrompt, setShowIOSPrompt, triggerInstall } = usePwaInstall();

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="mobile-header">
        <div className="logo-badge">
          <div className="logo-icon">AT</div>
          <span>AttendTrack</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isInstallable && (
            <button
              onClick={triggerInstall}
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-text)',
                border: '1px solid var(--primary)',
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Install AttendTrack as an App"
            >
              <span>📲</span>
              <span>Install</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '10px' }}>
            {getInitials(user?.name)}
          </div>

          {/* Mobile Sign Out Button */}
          <button
            onClick={logout}
            className="mobile-logout-btn"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Exit</span>
          </button>
        </div>
      </header>

      <IosInstallModal isOpen={showIOSPrompt} onClose={() => setShowIOSPrompt(false)} />
    </>
  );
}
