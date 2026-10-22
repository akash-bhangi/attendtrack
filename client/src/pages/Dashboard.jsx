import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { formatTime12h } from '../utils/formatters';
import './Dashboard.css';

// Helper to format Date into YYYY-MM-DD local string
const formatDateLocal = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to determine initial view date (defaults to a weekday so classes are immediately visible)
const getInitialDate = () => {
  const now = new Date();
  if (now.getDay() === 0) {
    // If today is Sunday, default to Wednesday of the week so classes show right away
    const d = new Date(now);
    d.setDate(now.getDate() - 4);
    return d;
  }
  return now;
};

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();
  const notify = useNotification();
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState({ dayName: '', date: '', slots: [] });
  const [summary, setSummary] = useState(null);

  // Mid-Semester Quick Catch-Up Modal state
  const [showMidSemModal, setShowMidSemModal] = useState(false);
  const [midSemData, setMidSemData] = useState([]);
  const [savingMidSem, setSavingMidSem] = useState(false);

  // Load summary and daily slots
  const fetchData = async (date) => {
    setLoading(true);
    try {
      const dateStr = formatDateLocal(date);
      const [todayRes, summaryRes] = await Promise.all([
        api.get(`/attendance/today?date=${dateStr}`),
        api.get('/analytics/summary')
      ]);

      if (todayRes.success) setTodayData(todayRes.data);
      if (summaryRes.success) setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  // One-tap attendance marking (Supports toggle / deselect)
  const handleMark = async (subjectId, status) => {
    try {
      const dateStr = formatDateLocal(selectedDate);
      const res = await api.post('/attendance/mark', {
        subjectId,
        status,
        date: dateStr
      });

      if (res.success) {
        const updatedStatus = res.data?.markedStatus || (status === 'Unmarked' ? 'Unmarked' : status);
        // Optimistic update locally
        setTodayData((prev) => ({
          ...prev,
          slots: prev.slots.map((slot) => {
            if (slot.subject && (slot.subject._id === subjectId || slot.subject.id === subjectId)) {
              return {
                ...slot,
                markedStatus: updatedStatus,
                notes: res.data?.notes !== undefined ? res.data.notes : slot.notes,
                subject: {
                  ...slot.subject,
                  ...res.data.subject
                }
              };
            }
            return slot;
          })
        }));

        // Refresh global summary
        const summaryRes = await api.get('/analytics/summary');
        if (summaryRes.success) setSummary(summaryRes.data);
      }
    } catch (err) {
      notify.error('Error updating attendance: ' + err.message);
    }
  };

  // Attendance Slot Notes state
  const [editingNoteSlotId, setEditingNoteSlotId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const toggleNoteEditor = (slotId, currentNote = '') => {
    if (editingNoteSlotId === slotId) {
      setEditingNoteSlotId(null);
    } else {
      setEditingNoteSlotId(slotId);
      setNoteText(currentNote || '');
    }
  };

  const handleSaveNote = async (subjectId, currentStatus) => {
    setSavingNote(true);
    try {
      const dateStr = formatDateLocal(selectedDate);
      const res = await api.post('/attendance/note', {
        subjectId,
        date: dateStr,
        notes: noteText,
        status: currentStatus !== 'Unmarked' ? currentStatus : 'Present'
      });

      if (res.success) {
        setTodayData((prev) => ({
          ...prev,
          slots: prev.slots.map((slot) => {
            if (slot.subject && (slot.subject._id === subjectId || slot.subject.id === subjectId)) {
              return {
                ...slot,
                notes: res.data?.notes !== undefined ? res.data.notes : noteText.trim(),
                markedStatus: res.data?.markedStatus || slot.markedStatus
              };
            }
            return slot;
          })
        }));
        notify.success('Session note updated', 'Note Saved');
        setEditingNoteSlotId(null);
      }
    } catch (err) {
      notify.error('Failed to save note: ' + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleClearNote = async (subjectId, currentStatus) => {
    try {
      const dateStr = formatDateLocal(selectedDate);
      const res = await api.post('/attendance/note', {
        subjectId,
        date: dateStr,
        notes: '',
        status: currentStatus
      });

      if (res.success) {
        setTodayData((prev) => ({
          ...prev,
          slots: prev.slots.map((slot) => {
            if (slot.subject && (slot.subject._id === subjectId || slot.subject.id === subjectId)) {
              return {
                ...slot,
                notes: ''
              };
            }
            return slot;
          })
        }));
        setEditingNoteSlotId(null);
        notify.info('Note removed', 'Note Cleared');
      }
    } catch (err) {
      notify.error('Failed to clear note: ' + err.message);
    }
  };

  // Week navigation
  const handlePrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDateChange = (e) => {
    if (!e.target.value) return;
    const parts = e.target.value.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      setSelectedDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  };

  const isPastDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return sel.getTime() < today.getTime();
  };

  // Mid-sem modal open & save
  const openMidSemModal = () => {
    if (summary && summary.subjectBreakdown) {
      setMidSemData(
        summary.subjectBreakdown.map((s) => ({
          subjectId: s.id || s._id,
          name: s.name,
          code: s.code,
          totalConducted: s.totalConducted || 0,
          totalAttended: s.totalAttended || 0
        }))
      );
    }
    setShowMidSemModal(true);
  };

  const handleSaveMidSem = async (e) => {
    e.preventDefault();
    setSavingMidSem(true);
    try {
      const baselines = midSemData.map((item) => ({
        subjectId: item.subjectId,
        totalConducted: Math.max(0, Number(item.totalConducted) || 0),
        totalAttended: Math.max(0, Number(item.totalAttended) || 0)
      }));
      const res = await api.post('/subjects/batch-baseline', { baselines });
      if (res.success) {
        notify.success('Mid-semester baseline attendance successfully updated!', 'Calibration Saved');
        setShowMidSemModal(false);
        fetchData(selectedDate);
      }
    } catch (err) {
      notify.error('Error saving mid-semester data: ' + err.message);
    } finally {
      setSavingMidSem(false);
    }
  };

  // Generate calendar days for the current selected week (Monday to Saturday)
  const getWeekDates = () => {
    const curr = new Date(selectedDate);
    const day = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        name: dayNames[i],
        num: d.getDate(),
        fullDate: d
      });
    }
    return days;
  };

  const weekDays = getWeekDates();

  return (
    <div className="content-container">
      {/* Top 4 KPI Metrics */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Cumulative Attendance</div>
          <div
            className="kpi-val"
            style={{
              color: summary && summary.overallPercentage >= (user?.targetPercentage || 75) ? 'var(--safe-text)' : 'var(--danger-text)'
            }}
          >
            {summary ? `${summary.overallPercentage}%` : '0%'}
          </div>
          <div className="kpi-sub">Target Criteria: {user?.targetPercentage || 75}%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Sessions Held</div>
          <div className="kpi-val">
            {summary ? `${summary.totalAttended} / ${summary.totalConducted}` : '0 / 0'}
          </div>
          <div className="kpi-sub">Attended vs. Conducted</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Safe Leave Margin</div>
          <div
            className="kpi-val"
            style={{
              color: summary && summary.overallSafeBunks > 0 ? 'var(--accent)' : 'var(--danger-text)'
            }}
          >
            {summary ? (summary.overallSafeBunks > 0 ? `+${summary.overallSafeBunks}` : `Need ${summary.overallClassesNeeded}`) : '0'}
          </div>
          <div className="kpi-sub">
            {summary && summary.overallSafeBunks > 0 ? 'Classes can miss safely' : 'Mandatory recovery classes'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">{user?.notificationDay ? `${user.notificationDay} Notification` : 'Sunday Notification'}</div>
          <div className="kpi-val" style={{ fontSize: '15px', marginTop: '10px', color: 'var(--text-main)' }}>
            {user?.emailNotificationsEnabled ? `Active (${formatTime12h(user?.notificationTime || '20:00')})` : 'Disabled'}
          </div>
          <div className="kpi-sub" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {user?.email}
          </div>
        </div>
      </div>

      <div className="dashboard-split">
        {/* Left Column: Daily Schedule */}
        <div>
          <div className="card-panel">
            <div className="card-panel-header schedule-card-header">
              <div className="schedule-header-title-group">
                <h2 className="card-panel-title">Scheduled Sessions</h2>
                <span className="schedule-header-date">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="schedule-header-actions">
                {onNavigate && (
                  <button
                    className="btn-secondary schedule-header-btn"
                    onClick={() => onNavigate('history')}
                    title="Open Full Semester Attendance Calendar and Logs"
                  >
                    📅 View Calendar
                  </button>
                )}
                <button
                  className="btn-primary schedule-header-btn"
                  onClick={openMidSemModal}
                  title="Directly enter total attended and conducted classes so far"
                >
                  ⚡ Mid-Sem Catch-Up
                </button>
                <span className="badge-pill badge-safe schedule-classes-badge">
                  {todayData.slots.length} Classes
                </span>
              </div>
            </div>

            {/* Week & Date Navigation Toolbar */}
            <div className="date-nav-toolbar">
              <div className="date-nav-week-btns">
                <button
                  className="btn-secondary"
                  onClick={handlePrevWeek}
                  title="Go to previous week"
                >
                  ◀ Prev
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleToday}
                  title="Jump to today"
                >
                  Today
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleNextWeek}
                  title="Go to next week"
                >
                  Next ▶
                </button>
              </div>

              <div className="date-nav-picker">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>📅 Date:</span>
                <input
                  type="date"
                  value={formatDateLocal(selectedDate)}
                  onChange={handleDateChange}
                />
              </div>
            </div>

            {/* Backfill banner if viewing past date */}
            {isPastDate() && (
              <div className="past-backfill-banner">
                <span className="past-backfill-text">
                  🕒 <strong>Past Attendance Backfill:</strong> Viewing classes for <strong>{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>. Mark Present/Absent below to record past days.
                </span>
                <button
                  className="btn-secondary past-backfill-btn"
                  onClick={handleToday}
                >
                  Go to Today
                </button>
              </div>
            )}

            {/* Date Picker Strip */}
            <div className="date-strip">
              {(() => {
                const todayDateString = new Date().toDateString();
                const selDateString = selectedDate.toDateString();
                return weekDays.map((item, idx) => {
                  const isSelected = item.fullDate.toDateString() === selDateString;
                  const isToday = item.fullDate.toDateString() === todayDateString;
                  return (
                    <div
                      key={idx}
                      className={`date-chip ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}`}
                      onClick={() => setSelectedDate(item.fullDate)}
                      title={isToday ? 'Today (Present Day)' : item.fullDate.toDateString()}
                    >
                      {isToday && <span className="today-indicator">TODAY</span>}
                      <span className="day">{item.name}</span>
                      <span className="num">{item.num}</span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Course Rows */}
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading schedule...
              </div>
            ) : todayData.slots.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  No classes scheduled for {todayData.dayName || 'this day'}.
                </div>
                <p style={{ fontSize: '12px', marginTop: '6px' }}>
                  Select another day (Mon–Sat) above, or add new period slots in the <strong>Timetable</strong> tab.
                </p>
                <div style={{ marginTop: '14px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      const wed = new Date(selectedDate);
                      wed.setDate(selectedDate.getDate() - selectedDate.getDay() + 3);
                      setSelectedDate(wed);
                    }}
                  >
                    View Wednesday Schedule
                  </button>
                </div>
              </div>
            ) : (
              todayData.slots.map((slot) => {
                const sub = slot.subject;
                if (!sub) return null;

                const targetPct = user?.targetPercentage || 75;
                const A = sub.totalAttended ?? 0;
                const T = sub.totalConducted ?? 0;
                const pct = T > 0 ? Number(((A / T) * 100).toFixed(1)) : 100;
                const isSafe = pct >= targetPct;
                const safeBunks =
                  sub.safeBunks !== undefined
                    ? sub.safeBunks
                    : Math.max(0, Math.floor((4 * A - 3 * T) / 3));
                const classesNeeded =
                  sub.classesNeeded !== undefined
                    ? sub.classesNeeded
                    : Math.max(0, Math.ceil(3 * T - 4 * A));

                const isPresent = slot.markedStatus === 'Present';
                const isAbsent = slot.markedStatus === 'Absent';
                const isCancelled = slot.markedStatus === 'Cancelled';

                return (
                  <div
                    className={`course-item ${isSafe ? 'status-safe-border' : 'status-danger-border'}`}
                    key={slot.slotId}
                  >
                    <div className="course-main-row">
                      <div className="course-info">
                        <div className="course-meta-tags">
                          {sub.code && <span className="course-code-tag">{sub.code}</span>}
                          <span className="course-time-tag">
                            🕒 {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                          </span>
                          {slot.room && <span className="course-room-tag">📍 Room {slot.room}</span>}
                          <span className="badge-pill badge-neutral" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {sub.type}
                          </span>
                        </div>
                        <div className="course-title">{sub.name}</div>
                        <div className="course-details-row">
                          <span className="course-faculty">
                            {sub.faculty ? `Faculty: ${sub.faculty}` : 'Faculty: Department Staff'}
                          </span>
                          <span className="course-details-dot">•</span>
                          {slot.notes ? (
                            <button
                              type="button"
                              className="course-note-badge"
                              onClick={() => toggleNoteEditor(slot.slotId, slot.notes)}
                              title="Click to edit or remove note"
                            >
                              <span className="note-badge-icon">📝</span>
                              <span className="note-badge-text">"{slot.notes}"</span>
                              <span className="note-badge-edit">✏️</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="course-add-note-btn"
                              onClick={() => toggleNoteEditor(slot.slotId, '')}
                              title="Add a note or reason for this class (medical, OD, quiz, etc.)"
                            >
                              <span>+ Note</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="course-stat-col">
                        <div className="course-stat-top-row">
                          <div className="course-pct-row">
                            <span
                              className="course-pct"
                              style={{ color: isSafe ? 'var(--safe-text)' : 'var(--danger-text)' }}
                            >
                              {pct}%
                            </span>
                            <span className="course-held">
                              ({A}/{T} held)
                            </span>
                          </div>

                          {/* Compliance Status Badge */}
                          <div className="course-compliance-badge">
                            {isSafe ? (
                              <span
                                className="badge-pill badge-safe"
                                title={`You can safely miss up to ${safeBunks} more classes and stay above ${targetPct}%`}
                              >
                                🛡️ Safe (+{safeBunks} {safeBunks === 1 ? 'bunk' : 'bunks'})
                              </span>
                            ) : (
                              <span
                                className="badge-pill badge-danger"
                                title={`Must attend the next ${classesNeeded} consecutive classes to recover ${targetPct}% attendance`}
                              >
                                ⚠️ Deficit (Need {classesNeeded})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mini Visual Progress Bar */}
                        <div className="mini-progress-track">
                          <div
                            className={`mini-progress-fill ${isSafe ? 'safe' : 'danger'}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>

                      <div className="action-button-group">
                        <button
                          type="button"
                          className={`btn-mark btn-present ${isPresent ? 'selected-present' : ''}`}
                          onClick={() => handleMark(sub._id || sub.id, isPresent ? 'Unmarked' : 'Present')}
                          title={isPresent ? 'Click to unmark Present' : 'Mark attended (+1 attended, +1 held)'}
                        >
                          <span style={{ fontSize: '13px' }}>✓</span>
                          <span>Present</span>
                        </button>
                        <button
                          type="button"
                          className={`btn-mark btn-absent ${isAbsent ? 'selected-absent' : ''}`}
                          onClick={() => handleMark(sub._id || sub.id, isAbsent ? 'Unmarked' : 'Absent')}
                          title={isAbsent ? 'Click to unmark Absent' : 'Mark absent (0 attended, +1 held)'}
                        >
                          <span style={{ fontSize: '12px' }}>✕</span>
                          <span>Absent</span>
                        </button>
                        <button
                          type="button"
                          className={`btn-mark btn-cancelled ${isCancelled ? 'selected-cancelled' : ''}`}
                          onClick={() => handleMark(sub._id || sub.id, isCancelled ? 'Unmarked' : 'Cancelled')}
                          title={isCancelled ? 'Click to remove cancellation (unmark)' : 'Mark class cancelled (no impact on percentage)'}
                        >
                          <span style={{ fontSize: '12px' }}>⊘</span>
                          <span>Cancelled</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Expandable Note Editor Drawer */}
                    {editingNoteSlotId === slot.slotId && (
                      <div className="slot-note-editor">
                        <div className="slot-note-editor-header">
                          <span className="slot-note-editor-title">📝 Session Note / Reason:</span>
                          <button
                            type="button"
                            className="slot-note-close-btn"
                            onClick={() => setEditingNoteSlotId(null)}
                            title="Close note editor"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="slot-note-presets">
                          {['🤒 Medical / Sick', '🏆 On Duty (OD)', '🚫 Prof Cancelled', '📝 Quiz / Exam', '🚗 Family / Travel'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className={`preset-chip ${noteText === preset ? 'active' : ''}`}
                              onClick={() => setNoteText(preset)}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <div className="slot-note-input-row">
                          <input
                            type="text"
                            className="slot-note-input"
                            placeholder="Enter reason or reminder (e.g. Fever, Sports fest, Quiz on Unit 2)..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveNote(sub._id || sub.id, slot.markedStatus);
                              }
                            }}
                            autoFocus
                          />
                          <div className="slot-note-actions">
                            {slot.notes && (
                              <button
                                type="button"
                                className="btn-secondary slot-note-btn"
                                onClick={() => handleClearNote(sub._id || sub.id, slot.markedStatus)}
                                title="Delete this note"
                                style={{ color: 'var(--danger-text)' }}
                              >
                                Clear
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn-primary slot-note-btn"
                              onClick={() => handleSaveNote(sub._id || sub.id, slot.markedStatus)}
                              disabled={savingNote}
                            >
                              {savingNote ? 'Saving...' : 'Save Note'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: 75% Advisory Panel */}
        <div>
          <div className="card-panel">
            <div className="card-panel-header">
              <h3 className="card-panel-title">75% Criteria Advisory</h3>
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
              <p>
                Standing Status:{' '}
                <strong style={{ color: summary?.isCompliant ? 'var(--safe-text)' : 'var(--danger-text)' }}>
                  {summary?.isCompliant ? 'Compliant' : 'Shortage Detected'}
                </strong>
              </p>

              {summary?.atRiskSubjects && summary.atRiskSubjects.length > 0 ? (
                summary.atRiskSubjects.map((risk) => (
                  <div
                    key={risk.id}
                    style={{
                      marginTop: '14px',
                      padding: '12px',
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--danger-text)'
                    }}
                  >
                    <strong style={{ color: 'var(--text-main)' }}>Action Needed in {risk.name}:</strong>
                    <div style={{ marginTop: '2px', fontSize: '12px' }}>
                      Current attendance: <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>{risk.percentage}%</span>.
                      You must attend the next <strong>{risk.classesNeeded} consecutive classes</strong> to reach {user?.targetPercentage || 75}%.
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '12px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid var(--safe-text)'
                  }}
                >
                  <strong style={{ color: 'var(--text-main)' }}>All Subjects in Safe Zone:</strong>
                  <div style={{ marginTop: '2px', fontSize: '12px' }}>
                    Every registered subject is meeting or exceeding the {user?.targetPercentage || 75}% institutional requirement.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mid-Semester Quick Catch-Up Modal */}
      {showMidSemModal && (
        <div className="modal-backdrop" onClick={() => setShowMidSemModal(false)}>
          <div className="modal-card midsem-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="midsem-header">
              <div>
                <h3 className="midsem-title">⚡ Mid-Semester Quick Catch-Up</h3>
                <p className="midsem-desc">
                  Joined AttendTrack midway through the semester? Enter total classes held and attended so far to calibrate your 75% calculations instantly.
                </p>
              </div>
              <button
                type="button"
                className="midsem-close-btn"
                onClick={() => setShowMidSemModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMidSem}>
              {/* Desktop / Tablet Table View */}
              <div className="midsem-desktop-table">
                <table className="data-table" style={{ fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th style={{ width: '120px' }}>Held So Far</th>
                      <th style={{ width: '120px' }}>Attended</th>
                      <th style={{ width: '90px', textAlign: 'right' }}>Current %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {midSemData.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No subjects registered yet. Add courses in the Subjects or Timetable tab first.
                        </td>
                      </tr>
                    ) : (
                      midSemData.map((item, idx) => {
                        const T = Number(item.totalConducted) || 0;
                        const A = Number(item.totalAttended) || 0;
                        const pct = T > 0 ? ((A / T) * 100).toFixed(1) : '100.0';
                        const isSafe = Number(pct) >= (user?.targetPercentage || 75);

                        return (
                          <tr key={item.subjectId || idx}>
                            <td>
                              <strong>{item.name}</strong>
                              {item.code && <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.code}</div>}
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={item.totalConducted}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMidSemData((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, totalConducted: val } : p))
                                  );
                                }}
                                className="midsem-input-inline"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={item.totalAttended}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMidSemData((prev) =>
                                    prev.map((p, i) => (i === idx ? { ...p, totalAttended: val } : p))
                                  );
                                }}
                                className="midsem-input-inline"
                              />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: isSafe ? 'var(--safe-text)' : 'var(--danger-text)' }}>
                              {pct}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Touch-Optimized Cards View (<= 640px) */}
              <div className="midsem-mobile-cards">
                {midSemData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No subjects registered yet. Add courses in the Courses tab first.
                  </div>
                ) : (
                  midSemData.map((item, idx) => {
                    const T = Number(item.totalConducted) || 0;
                    const A = Number(item.totalAttended) || 0;
                    const pct = T > 0 ? ((A / T) * 100).toFixed(1) : '100.0';
                    const isSafe = Number(pct) >= (user?.targetPercentage || 75);

                    return (
                      <div key={item.subjectId || idx} className="midsem-card-item">
                        <div className="midsem-card-header">
                          <div>
                            <div className="midsem-card-title">{item.name}</div>
                            {item.code && <div className="midsem-card-code">{item.code}</div>}
                          </div>
                          <span className={`badge-pill ${isSafe ? 'badge-safe' : 'badge-danger'}`} style={{ fontWeight: 800 }}>
                            {pct}%
                          </span>
                        </div>
                        <div className="midsem-card-inputs">
                          <div className="midsem-input-group">
                            <label className="midsem-input-label">Held So Far</label>
                            <input
                              type="number"
                              min="0"
                              value={item.totalConducted}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMidSemData((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, totalConducted: val } : p))
                                );
                              }}
                              className="midsem-input-field"
                              placeholder="0"
                            />
                          </div>
                          <div className="midsem-input-group">
                            <label className="midsem-input-label">Attended</label>
                            <input
                              type="number"
                              min="0"
                              value={item.totalAttended}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMidSemData((prev) =>
                                  prev.map((p, i) => (i === idx ? { ...p, totalAttended: val } : p))
                                );
                              }}
                              className="midsem-input-field"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="midsem-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowMidSemModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingMidSem || midSemData.length === 0}>
                  {savingMidSem ? 'Saving...' : 'Save Mid-Semester Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
