import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePwaInstall } from '../utils/usePwaInstall';
import IosInstallModal from './IosInstallModal';
import './Navbar.css';

export default function Navbar() {
  const { user, theme, toggleTheme } = useAuth();
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
        </div>
      </header>

      <IosInstallModal isOpen={showIOSPrompt} onClose={() => setShowIOSPrompt(false)} />
    </>
  );
}
