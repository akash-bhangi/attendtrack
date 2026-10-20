import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Timetable from './pages/Timetable';
import Analytics from './pages/Analytics';
import History from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ margin: '0 auto 12px auto', width: '36px', height: '36px' }}>AT</div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Loading AttendTrack...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-layout">
      {/* Desktop Sidebar (>= 900px) */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Canvas */}
      <main className="app-main">
        {/* Mobile Top Header (< 900px) */}
        <Navbar />

        {/* Tab Content */}
        {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
        {currentTab === 'subjects' && <Subjects />}
        {currentTab === 'timetable' && <Timetable />}
        {currentTab === 'history' && <History />}
        {currentTab === 'analytics' && <Analytics />}
        {currentTab === 'settings' && <Settings />}

        {/* Mobile Bottom Navigation Bar (< 900px) */}
        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </main>
    </div>
  );
}
