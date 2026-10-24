import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../api/client';
import { formatTime12h } from '../utils/formatters';
import './Settings.css';

const safeFormatDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const notify = useNotification();

  const [startDate, setStartDate] = useState(safeFormatDate(user?.semesterStartDate));
  const [endDate, setEndDate] = useState(safeFormatDate(user?.semesterEndDate));
  const [targetPercentage, setTargetPercentage] = useState(user?.targetPercentage || 75);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(
    user?.emailNotificationsEnabled !== undefined ? user.emailNotificationsEnabled : true
  );
  const [notificationTime, setNotificationTime] = useState(user?.notificationTime || '20:00');
  const [notificationDay, setNotificationDay] = useState(user?.notificationDay || 'Sunday');
  const [notificationEmail, setNotificationEmail] = useState(
    user?.notificationEmail || user?.email || ''
  );
  const [saved, setSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testPreviewUrl, setTestPreviewUrl] = useState(null);
  const [testSentInfo, setTestSentInfo] = useState(null);

  // Sync state when user object loads or updates
  useEffect(() => {
    if (user) {
      setStartDate(safeFormatDate(user.semesterStartDate));
      setEndDate(safeFormatDate(user.semesterEndDate));
      if (user.targetPercentage) setTargetPercentage(user.targetPercentage);
      if (user.emailNotificationsEnabled !== undefined) setEmailNotificationsEnabled(user.emailNotificationsEnabled);
      if (user.notificationTime) setNotificationTime(user.notificationTime);
      if (user.notificationDay) setNotificationDay(user.notificationDay);
      setNotificationEmail(user.notificationEmail || user.email || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaved(false);
    const res = await updateProfile({
      semesterStartDate: startDate || null,
      semesterEndDate: endDate || null,
      targetPercentage: Number(targetPercentage),
      emailNotificationsEnabled,
      notificationTime,
      notificationDay,
      notificationEmail: notificationEmail.trim()
    });

    if (res.success) {
      setSaved(true);
      notify.success(
        `Automated notification (${notificationDay === 'Daily' ? 'Daily' : `Every ${notificationDay}`} at ${formatTime12h(notificationTime)}) saved and active!`,
        'Settings Saved'
      );
      setTimeout(() => setSaved(false), 3000);
    } else {
      notify.error('Error updating settings: ' + res.message, 'Update Failed');
    }
  };

  const handleTestEmail = async () => {
    setSendingTest(true);
    setTestPreviewUrl(null);
    setTestSentInfo(null);
    try {
      const res = await api.post('/analytics/send-test-email', {
        recipientEmail: notificationEmail.trim()
      });
      if (res.success) {
        if (res.data?.previewUrl) {
          setTestPreviewUrl(res.data.previewUrl);
        }
        setTestSentInfo(res.data);
        notify.success(res.message || `Test digest sent for ${notificationEmail || user?.email}!`, 'Email Dispatched');
      }
    } catch (err) {
      notify.error('Failed to trigger test email: ' + err.message, 'Dispatch Error');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="content-container" style={{ maxWidth: '720px' }}>
      <div className="card-panel">
        <div className="card-panel-header">
          <div>
            <h2 className="card-panel-title">Academic Semester Settings</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Configure semester dates and compliance parameters
            </span>
          </div>
        </div>

        {saved && (
          <div style={{ background: 'var(--safe-bg)', border: '1px solid var(--safe-border)', color: 'var(--safe-text)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
            ✓ Semester parameters and custom notification preferences saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Student Profile (Google Account)
            </label>
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
              <strong>{user?.name}</strong> • <span style={{ color: 'var(--text-muted)' }}>{user?.email}</span>
            </div>
          </div>

          <div className="settings-dates-grid">
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Semester Commencement Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Semester Concluding Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Mandatory Minimum Attendance Target (%)
            </label>
            <input
              type="number"
              min="50"
              max="95"
              value={targetPercentage}
              onChange={(e) => setTargetPercentage(e.target.value)}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Default college criteria is 75%. You can set 80% or 85% for safer buffers.
            </span>
          </div>

          {/* Custom Automated Email Notification Box */}
          <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                  style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                />
                <span>Enable Automated Attendance Email Digest</span>
              </label>
              <span className={`badge-pill ${emailNotificationsEnabled ? 'badge-safe' : 'badge-neutral'}`}>
                {emailNotificationsEnabled ? 'Active Worker' : 'Disabled'}
              </span>
            </div>

            {emailNotificationsEnabled && (
              <div className="settings-nested-box">
                <div className="settings-schedule-grid">
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Delivery Frequency / Day
                    </label>
                    <select
                      value={notificationDay}
                      onChange={(e) => setNotificationDay(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px' }}
                    >
                      <option value="Daily">Daily (Every Single Day)</option>
                      <option value="Sunday">Sunday (Weekly Weekend Digest)</option>
                      <option value="Monday">Monday (Week Kickoff)</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday (Mid-Week Check)</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday (End of Week Wrap-up)</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Delivery Time ({formatTime12h(notificationTime)})
                    </label>
                    <input
                      type="time"
                      value={notificationTime}
                      onChange={(e) => setNotificationTime(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Digest Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="e.g. student@college.edu"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  📬 <strong>Live Schedule:</strong> Dispatches automatically{' '}
                  <strong style={{ color: 'var(--text-main)' }}>
                    {notificationDay === 'Daily' ? 'Every Day' : `Every ${notificationDay}`}
                  </strong>{' '}
                  at{' '}
                  <strong style={{ color: 'var(--text-main)' }}>{formatTime12h(notificationTime)}</strong> to{' '}
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{notificationEmail || user?.email}</span>.
                </div>

                {/* Instant Test Dispatch Trigger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-secondary settings-test-btn"
                    onClick={handleTestEmail}
                    disabled={sendingTest || !notificationEmail.trim()}
                  >
                    {sendingTest ? 'Dispatching...' : '⚡ Test Send Notification Now'}
                  </button>
                </div>

                {testSentInfo && (
                  <div style={{ background: 'var(--safe-bg)', border: '1px solid var(--safe-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12px', color: 'var(--safe-text)', lineHeight: '1.5' }}>
                    ✓ <strong>Email Dispatched!</strong> Delivered directly to <strong>{testSentInfo.to}</strong>.
                    <br />
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>
                      💡 Tip: If not visible in Primary, check your <strong>Spam</strong> or <strong>Promotions / Updates</strong> folder.
                    </span>
                  </div>
                )}

                {/* Live Ethereal Preview Box if generated */}
                {testPreviewUrl && (
                  <div style={{ background: 'var(--safe-bg)', border: '1px solid var(--safe-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '12px', color: 'var(--safe-text)' }}>
                    🎉 <strong>Email Successfully Generated!</strong>{' '}
                    <a href={testPreviewUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--safe-text)', fontWeight: 700, textDecoration: 'underline' }}>
                      Click here to view delivered HTML email preview ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" className="btn-primary">
              Save Academic Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
