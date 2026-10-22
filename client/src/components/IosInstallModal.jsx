import React from 'react';

export default function IosInstallModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          maxWidth: '400px',
          width: '100%',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <img
            src="/favicon/icon-192.png"
            alt="AttendTrack Logo"
            style={{ width: '56px', height: '56px', borderRadius: '12px' }}
          />
        </div>

        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
          Install AttendTrack App
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '1.4' }}>
          Install AttendTrack on your iPhone or iPad for instant full-screen access without browser bars.
        </p>

        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '14px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '12.5px',
            color: 'var(--text-main)',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>1️⃣</span>
            <span>Tap the <strong>Share</strong> button <span style={{ fontSize: '16px' }}>⎋</span> in Safari's bottom toolbar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>2️⃣</span>
            <span>Scroll down and select <strong>"Add to Home Screen"</strong> <span style={{ fontSize: '16px' }}>⊞</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>3️⃣</span>
            <span>Tap <strong>"Add"</strong> in the top right corner</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onClose}
          style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
