import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, theme, toggleTheme } = useAuth();

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
    <header className="mobile-header">
      <div className="logo-badge">
        <div className="logo-icon">AT</div>
        <span>AttendTrack</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--text-main)',
            cursor: 'pointer'
          }}
          title="Toggle Theme"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '11px' }}>
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
  );
}
