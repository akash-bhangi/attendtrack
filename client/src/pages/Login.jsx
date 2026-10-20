import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { loginWithGoogle, loginAsDemo, theme, toggleTheme } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      setLoading(true);
      setError('');
      const res = await loginWithGoogle(credentialResponse.credential);
      if (!res.success) {
        setError(res.message || 'Google login failed. Please check backend connection.');
      }
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');
    const res = await loginAsDemo();
    if (!res.success) {
      setError(res.message || 'Demo login failed');
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'var(--bg-page)'
      }}
    >
      <div
        className="card-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 30px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <div
            className="logo-icon"
            style={{ width: '42px', height: '42px', fontSize: '18px', borderRadius: '10px' }}
          >
            AT
          </div>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
          AttendTrack Portal
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
          Smart Student Attendance & 75% Compliance Engine
        </p>

        {error && (
          <div
            style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              marginTop: '16px',
              textAlign: 'left'
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          {/* Active Google Sign-In Component */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => setError('Google Authentication was cancelled or failed.')}
              theme={theme === 'dark' ? 'filled_black' : 'outline'}
              shape="rectangular"
              text="continue_with"
              size="large"
              width="300"
            />
          </div>

          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          </div>

          {/* Quick Demo Access */}
          <button
            onClick={handleDemo}
            className="btn-secondary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
          >
            {loading ? 'Entering...' : '🚀 Open with Demo Student Account'}
          </button>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Sign in with your Google Email to sync your subjects, receive weekly Sunday email summaries, and track your 75% attendance criteria.
        </div>

        <div style={{ marginTop: '16px' }}>
          <button
            onClick={toggleTheme}
            style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
          </button>
        </div>
      </div>
    </div>
  );
}
