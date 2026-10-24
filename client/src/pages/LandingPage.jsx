import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

export default function LandingPage() {
  const { loginWithGoogle, loginAsDemo, theme, toggleTheme } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Interactive Safe Bunk Simulator State
  const [simTotal, setSimTotal] = useState(24);
  const [simAttended, setSimAttended] = useState(20);
  const [simTarget, setSimTarget] = useState(75);

  // Simulator Math
  const curPct = simTotal > 0 ? ((simAttended / simTotal) * 100).toFixed(1) : 0;
  const isSafe = parseFloat(curPct) >= simTarget;

  let simAdvice = '';
  if (isSafe) {
    // How many classes can be missed without dropping below target
    const maxBunks = Math.floor((simAttended - (simTarget / 100) * simTotal) / (simTarget / 100));
    simAdvice = maxBunks > 0
      ? `🎉 Excellent! You can safely skip up to ${maxBunks} upcoming class${maxBunks > 1 ? 'es' : ''} and still stay above ${simTarget}%.`
      : `⚠️ You are right on the edge of ${simTarget}%. You cannot skip your next lecture.`;
  } else {
    // How many consecutive classes must be attended to reach target
    const needed = Math.ceil(((simTarget / 100) * simTotal - simAttended) / (1 - simTarget / 100));
    simAdvice = `🚨 Attendance is below criteria! You must attend the next ${needed} consecutive class${needed > 1 ? 'es' : ''} to recover to ${simTarget}%.`;
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    if (credentialResponse.credential) {
      setAuthLoading(true);
      setAuthError('');
      const res = await loginWithGoogle(credentialResponse.credential);
      if (!res.success) {
        setAuthError(res.message || 'Google login failed. Please verify network/backend.');
      }
      setAuthLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    const res = await loginAsDemo();
    if (!res.success) {
      setAuthError(res.message || 'Demo login failed');
    }
    setAuthLoading(false);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Background ambient lighting */}
      <div className="landing-ambient-glow" />

      {/* ================= HEADER / NAVBAR ================= */}
      <header className="landing-header">
        <nav className="landing-nav">
          <a href="#" className="landing-brand">
            <div className="logo-icon" style={{ width: '32px', height: '32px', fontSize: '14px', borderRadius: '8px' }}>
              AT
            </div>
            <span>AttendTrack</span>
            <span className="landing-brand-badge">v2.0</span>
          </a>

          <div className="landing-nav-links">
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }} className="landing-nav-link">
              Features
            </a>
            <a href="#simulator" onClick={(e) => { e.preventDefault(); scrollToSection('simulator'); }} className="landing-nav-link">
              Bunk Calculator
            </a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works'); }} className="landing-nav-link">
              How It Works
            </a>
            <a href="#pwa" onClick={(e) => { e.preventDefault(); scrollToSection('pwa'); }} className="landing-nav-link">
              Mobile App
            </a>
          </div>

          <div className="landing-nav-actions">
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title="Toggle Dark/Light Mode"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button
              onClick={handleDemoLogin}
              disabled={authLoading}
              className="btn-hero-demo"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              ⚡ Demo
            </button>

            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-hero-primary"
              style={{ padding: '8px 16px', fontSize: '12px' }}
            >
              Sign In
            </button>
          </div>
        </nav>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="landing-hero">
        <div className="hero-pill">
          <span className="hero-pill-sparkle">✨</span>
          <span>Academic Attendance & Safe Bunk Engine</span>
        </div>

        <h1 className="hero-title">
          Never Fall Below <span className="hero-gradient-text">75% Attendance</span> Again.
        </h1>

        <p className="hero-subtitle">
          The smart companion built for university students. Calculate safe bunks in real-time,
          scan paper timetables with Gemini AI, and receive automated weekly email digests.
        </p>

        <div className="hero-cta-group">
          <button
            onClick={() => setShowAuthModal(true)}
            className="btn-hero-primary"
          >
            <span>🚀 Get Started Free</span>
          </button>

          <button
            onClick={handleDemoLogin}
            disabled={authLoading}
            className="btn-hero-demo"
          >
            <span>{authLoading ? 'Entering...' : '⚡ Try Interactive Demo'}</span>
          </button>
        </div>

        <div className="hero-guarantee">
          <span>✓ 100% Free Forever</span>
          <span>✓ No Credit Card Required</span>
          <span>✓ Installable on iOS & Android</span>
          <span>✓ Zero Spreadsheets Needed</span>
        </div>

        {/* Live Mockup Dashboard Card */}
        <div className="hero-preview-wrapper">
          <div className="mockup-window">
            <div className="mockup-header-bar">
              <div className="mockup-dots">
                <div className="mockup-dot dot-red" />
                <div className="mockup-dot dot-yellow" />
                <div className="mockup-dot dot-green" />
              </div>
              <div className="mockup-url-pill">attendtrack.com / live-dashboard</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target: 75%</div>
            </div>

            <div className="mockup-body">
              {/* Card 1: Safe */}
              <div className="mockup-card">
                <div className="mockup-card-head">
                  <div>
                    <div className="mockup-sub-title">Operating Systems</div>
                    <div className="mockup-sub-code">CS-301 • Theory</div>
                  </div>
                  <div className="mockup-pct pct-safe">85.0%</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Attended 17 of 20 conducted lectures
                </div>
                <div className="mockup-badge badge-safe">
                  <span>🎉</span>
                  <span>Safe to bunk next 2 classes</span>
                </div>
              </div>

              {/* Card 2: Warning */}
              <div className="mockup-card">
                <div className="mockup-card-head">
                  <div>
                    <div className="mockup-sub-title">Computer Networks</div>
                    <div className="mockup-sub-code">CS-304 • Theory</div>
                  </div>
                  <div className="mockup-pct pct-danger">71.4%</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Attended 15 of 21 conducted lectures
                </div>
                <div className="mockup-badge badge-danger">
                  <span>⚠️</span>
                  <span>Must attend next 2 lectures</span>
                </div>
              </div>

              {/* Card 3: Lab Safe */}
              <div className="mockup-card">
                <div className="mockup-card-head">
                  <div>
                    <div className="mockup-sub-title">Networks Lab</div>
                    <div className="mockup-sub-code">CS-308P • Practical</div>
                  </div>
                  <div className="mockup-pct pct-safe">88.9%</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Attended 8 of 9 conducted sessions
                </div>
                <div className="mockup-badge badge-safe">
                  <span>🎉</span>
                  <span>Safe to bunk 1 lab session</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= INTERACTIVE SIMULATOR ================= */}
      <section id="simulator" className="landing-section">
        <div className="section-head">
          <div className="section-tag">Interactive Preview</div>
          <h2 className="section-title">Test the Safe Bunk Math Right Now</h2>
          <p className="section-subtitle">
            Slide the bars below to test your college attendance numbers and see how AttendTrack calculates your exact safety margin.
          </p>
        </div>

        <div className="simulator-card">
          <div className="sim-target-toggle">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>University Criteria:</span>
            <button
              onClick={() => setSimTarget(75)}
              className={`target-pill-btn ${simTarget === 75 ? 'active' : ''}`}
            >
              75% Target
            </button>
            <button
              onClick={() => setSimTarget(85)}
              className={`target-pill-btn ${simTarget === 85 ? 'active' : ''}`}
            >
              85% Target
            </button>
          </div>

          <div className="sim-controls">
            <div className="sim-group">
              <div className="sim-label">
                <span>Total Classes Conducted:</span>
                <span className="sim-val">{simTotal}</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                value={simTotal}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setSimTotal(val);
                  if (simAttended > val) setSimAttended(val);
                }}
                className="sim-slider"
              />
            </div>

            <div className="sim-group">
              <div className="sim-label">
                <span>Classes You Attended:</span>
                <span className="sim-val">{simAttended}</span>
              </div>
              <input
                type="range"
                min="0"
                max={simTotal}
                value={simAttended}
                onChange={(e) => setSimAttended(parseInt(e.target.value, 10))}
                className="sim-slider"
              />
            </div>
          </div>

          <div className={`sim-result-box ${isSafe ? 'sim-result-safe' : 'sim-result-danger'}`}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              Calculated Attendance:
            </div>
            <div className="sim-pct-big">{curPct}%</div>
            <div className="sim-advice">{simAdvice}</div>
          </div>
        </div>
      </section>

      {/* ================= CORE FEATURES GRID ================= */}
      <section id="features" className="landing-section">
        <div className="section-head">
          <div className="section-tag">Powerful Capabilities</div>
          <h2 className="section-title">Everything Needed to Stay Compliant</h2>
          <p className="section-subtitle">
            Say goodbye to confusing Excel spreadsheets and frantic exam-week calculations.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon-box">🎯</div>
            <h3 className="feature-title">Live Safe Bunk Calculator</h3>
            <p className="feature-desc">
              Accurate mathematical projections. Know down to the exact lecture whether you can skip or must attend to protect your hall ticket.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-box">📸</div>
            <h3 className="feature-title">AI Timetable Vision Scanner</h3>
            <p className="feature-desc">
              Powered by Google Gemini AI. Snap a photo of your paper class timetable and let AI parse your subjects, room numbers, and timings in seconds.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-box">📩</div>
            <h3 className="feature-title">Sunday Automated Email Digest</h3>
            <p className="feature-desc">
              Receive a weekly summary in your email inbox every Sunday evening with attendance percentages, bunk forecasts, and critical warnings.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-box">📱</div>
            <h3 className="feature-title">Installable Progressive Web App</h3>
            <p className="feature-desc">
              Install AttendTrack directly to your phone’s home screen on Android or iPhone. Fast, lightweight, and works seamlessly on mobile.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-box">📝</div>
            <h3 className="feature-title">Notes & Absence Ledger</h3>
            <p className="feature-desc">
              Keep records of why you were absent (e.g., Medical leave, Hackathon, College Fest) with timestamped history logs for college documentation.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon-box">📊</div>
            <h3 className="feature-title">PDF & Excel Export</h3>
            <p className="feature-desc">
              Generate clean, formatted attendance sheets in one click for academic submissions, proctor meetings, or personal records.
            </p>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="landing-section">
        <div className="section-head">
          <div className="section-tag">Simple & Intuitive</div>
          <h2 className="section-title">How AttendTrack Works in 3 Steps</h2>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3 className="step-title">Add Subjects & Timetable</h3>
            <p className="step-desc">
              Enter your course list or upload a timetable picture. AttendTrack organizes your week day by day.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">2</div>
            <h3 className="step-title">One-Tap Daily Marking</h3>
            <p className="step-desc">
              When class ends, tap <strong>Present</strong>, <strong>Absent</strong>, or <strong>Cancelled</strong>. Your percentages update instantly.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">3</div>
            <h3 className="step-title">Stay Above 75% Stress-Free</h3>
            <p className="step-desc">
              The engine alerts you whenever you approach danger levels, keeping you safe from detention lists.
            </p>
          </div>
        </div>
      </section>

      {/* ================= PWA BANNER ================= */}
      <section id="pwa" className="landing-section">
        <div className="cta-banner">
          <h2 className="cta-banner-title">Take AttendTrack With You to Every Lecture</h2>
          <p className="cta-banner-sub">
            Works on any phone, tablet, or laptop. No 50 MB downloads or App Store accounts required.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAuthModal(true)}
              className="btn-hero-primary"
              style={{ background: '#ffffff', color: '#0f172a' }}
            >
              Sign Up with Google Free
            </button>
            <button
              onClick={handleDemoLogin}
              disabled={authLoading}
              className="btn-hero-demo"
              style={{ background: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              Try Instant Demo
            </button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="logo-icon" style={{ width: '22px', height: '22px', fontSize: '10px' }}>AT</div>
            <span><strong>AttendTrack</strong> • Academic Attendance Management</span>
          </div>

          <div className="footer-links">
            <a href="https://github.com/akash-bhangi/attendtrack" target="_blank" rel="noreferrer">
              GitHub Repository
            </a>
            <a href="#features">Features</a>
            <a href="#simulator">Calculator</a>
            <button
              onClick={toggleTheme}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>

          <div>
            © {new Date().getFullYear()} AttendTrack. Free & Open Source for students.
          </div>
        </div>
      </footer>

      {/* ================= AUTH MODAL ================= */}
      {showAuthModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="auth-modal-close"
              onClick={() => setShowAuthModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
              <div className="logo-icon" style={{ width: '42px', height: '42px', fontSize: '18px', borderRadius: '10px' }}>
                AT
              </div>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              Welcome to AttendTrack
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
              Sign in with your Google account to track your academic attendance
            </p>

            {authError && (
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
                {authError}
              </div>
            )}

            <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setAuthError('Google sign in was cancelled or failed.')}
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

              <button
                onClick={handleDemoLogin}
                className="btn-secondary"
                disabled={authLoading}
                style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}
              >
                {authLoading ? 'Entering...' : '🚀 Open with Demo Student Account'}
              </button>
            </div>

            <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
              No spam. We only use your Google profile to securely save your timetable and send optional Sunday summaries.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
