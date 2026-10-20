import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './History.css';

// Helper to get local date in YYYY-MM-DD format (prevents UTC timezone shift bug)
const toLocalDateStr = (d) => {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function History() {
  const { user } = useAuth();
  const notify = useNotification();

  const [logs, setLogs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'timeline'

  // Calendar navigation state (Year and Month)
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => new Date());
  // Selected day for mobile detail inspector
  const [selectedDayCell, setSelectedDayCell] = useState(null);

  // History note editing state
  const [editingNoteLog, setEditingNoteLog] = useState(null);
  const [historyNoteText, setHistoryNoteText] = useState('');
  const [savingHistoryNote, setSavingHistoryNote] = useState(false);

  const openHistoryNoteModal = (log) => {
    setEditingNoteLog(log);
    setHistoryNoteText(log.notes || '');
  };

  const saveHistoryNote = async () => {
    if (!editingNoteLog) return;
    setSavingHistoryNote(true);
    try {
      const subjectId = editingNoteLog.subjectId?._id || editingNoteLog.subjectId;
      const res = await api.post('/attendance/note', {
        subjectId,
        date: editingNoteLog.date,
        notes: historyNoteText,
        status: editingNoteLog.status
      });

      if (res.success) {
        setLogs((prev) =>
          prev.map((l) => (l._id === editingNoteLog._id ? { ...l, notes: historyNoteText.trim() } : l))
        );
        notify.success('Attendance record note updated', 'Note Saved');
        setEditingNoteLog(null);
      }
    } catch (err) {
      notify.error('Failed to update note: ' + err.message);
    } finally {
      setSavingHistoryNote(false);
    }
  };

  const clearHistoryNote = async () => {
    if (!editingNoteLog) return;
    try {
      const subjectId = editingNoteLog.subjectId?._id || editingNoteLog.subjectId;
      const res = await api.post('/attendance/note', {
        subjectId,
        date: editingNoteLog.date,
        notes: '',
        status: editingNoteLog.status
      });

      if (res.success) {
        setLogs((prev) =>
          prev.map((l) => (l._id === editingNoteLog._id ? { ...l, notes: '' } : l))
        );
        notify.info('Note removed', 'Note Cleared');
        setEditingNoteLog(null);
      }
    } catch (err) {
      notify.error('Failed to clear note: ' + err.message);
    }
  };

  // Load subjects for filter dropdown
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/subjects');
        if (res.success) {
          setSubjects(res.data);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch attendance history whenever filters change
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject && selectedSubject !== 'all') params.append('subjectId', selectedSubject);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/attendance/history${queryStr}`);
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load attendance history:', err);
      notify.error('Could not load attendance logs: ' + err.message, 'History Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedSubject, selectedStatus, startDate, endDate]);

  // Map logs by local YYYY-MM-DD for accurate calendar lookup
  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach((log) => {
      if (!log.date) return;
      const dStr = toLocalDateStr(log.date);
      if (!dStr) return;
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(log);
    });
    return map;
  }, [logs]);

  // Aggregate stats from filtered logs
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let cancelled = 0;

    logs.forEach((l) => {
      if (l.status === 'Present') present++;
      else if (l.status === 'Absent') absent++;
      else if (l.status === 'Cancelled') cancelled++;
    });

    const totalConducted = present + absent;
    const rate = totalConducted > 0 ? Math.round((present / totalConducted) * 100) : 0;

    return {
      totalLogs: logs.length,
      present,
      absent,
      cancelled,
      rate
    };
  }, [logs]);

  // Calendar month calculation using local dates
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = toLocalDateStr(prevDate);
      days.push({
        date: prevDate,
        dateStr,
        dayNum,
        isCurrentMonth: false,
        logs: logsByDate[dateStr] || []
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const curDate = new Date(year, month, dayNum);
      const dateStr = toLocalDateStr(curDate);
      days.push({
        date: curDate,
        dateStr,
        dayNum,
        isCurrentMonth: true,
        logs: logsByDate[dateStr] || []
      });
    }

    // Trailing days to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month + 1, dayNum);
      const dateStr = toLocalDateStr(nextDate);
      days.push({
        date: nextDate,
        dateStr,
        dayNum,
        isCurrentMonth: false,
        logs: logsByDate[dateStr] || []
      });
    }

    return days;
  }, [currentCalendarDate, logsByDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  const currentMonthToday = () => {
    setCurrentCalendarDate(new Date());
  };

  const clearFilters = () => {
    setSelectedSubject('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="content-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.4px' }}>
            Attendance History & Semester Calendar
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Audit daily logs across the semester, inspect status distributions, and navigate calendar heatmaps.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className={`btn-secondary ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
            style={{
              fontSize: '12px',
              padding: '7px 14px',
              background: viewMode === 'calendar' ? 'var(--primary)' : 'var(--bg-surface)',
              color: viewMode === 'calendar' ? 'var(--primary-text)' : 'var(--text-main)',
              borderColor: viewMode === 'calendar' ? 'var(--primary)' : 'var(--border)'
            }}
          >
            📅 Calendar Heatmap
          </button>
          <button
            type="button"
            className={`btn-secondary ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
            style={{
              fontSize: '12px',
              padding: '7px 14px',
              background: viewMode === 'timeline' ? 'var(--primary)' : 'var(--bg-surface)',
              color: viewMode === 'timeline' ? 'var(--primary-text)' : 'var(--text-main)',
              borderColor: viewMode === 'timeline' ? 'var(--primary)' : 'var(--border)'
            }}
          >
            📋 Log Timeline ({logs.length})
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-title">Recorded Sessions</div>
          <div className="kpi-val">{stats.totalLogs}</div>
          <div className="kpi-sub">Matching applied criteria</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Attended (Present)</div>
          <div className="kpi-val" style={{ color: 'var(--safe-text)' }}>{stats.present}</div>
          <div className="kpi-sub">Classes physically attended</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Missed (Absent)</div>
          <div className="kpi-val" style={{ color: stats.absent > 0 ? 'var(--danger-text)' : 'var(--text-main)' }}>
            {stats.absent}
          </div>
          <div className="kpi-sub">Unattended / bunked lectures</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Effective Attendance</div>
          <div
            className="kpi-val"
            style={{
              color: stats.rate >= (user?.targetPercentage || 75) ? 'var(--safe-text)' : 'var(--danger-text)'
            }}
          >
            {stats.rate}%
          </div>
          <div className="kpi-sub">Excludes cancelled classes ({stats.cancelled})</div>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="card-panel" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Records
          </span>

          {(selectedSubject !== 'all' || selectedStatus !== 'all' || startDate || endDate) && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--danger-text)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)'
              }}
            >
              <option value="all">All Subjects ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name} ({s.code || 'No code'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Marked Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="Present">Present Only</option>
              <option value="Absent">Absent Only</option>
              <option value="Cancelled">Cancelled Only</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="card-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading attendance timeline and calendar data...
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar Heatmap View */
        <div className="card-panel calendar-container">
          {/* Calendar Header with navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {monthNames[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}
              </h2>
              <button
                type="button"
                onClick={currentMonthToday}
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Today
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={prevMonth}
                style={{ padding: '6px 12px', fontSize: '13px' }}
                title="Previous Month"
              >
                ← Prev
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={nextMonth}
                style={{ padding: '6px 12px', fontSize: '13px' }}
                title="Next Month"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Heatmap Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>Legend:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--safe-text)' }}></span>
              Present
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--danger-text)' }}></span>
              Absent
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--cancelled-text)' }}></span>
              Cancelled
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--border)' }}></span>
              No Logs / Holiday
            </span>
          </div>

          {/* Weekday headers */}
          <div className="calendar-grid" style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <div className="calendar-weekday-header">Sun</div>
            <div className="calendar-weekday-header">Mon</div>
            <div className="calendar-weekday-header">Tue</div>
            <div className="calendar-weekday-header">Wed</div>
            <div className="calendar-weekday-header">Thu</div>
            <div className="calendar-weekday-header">Fri</div>
            <div className="calendar-weekday-header">Sat</div>
          </div>

          {/* Calendar Day Grid */}
          <div className="calendar-grid">
            {calendarDays.map((cell, idx) => {
              const isToday = toLocalDateStr(new Date()) === cell.dateStr;
              const isSelected = selectedDayCell && selectedDayCell.dateStr === cell.dateStr;
              const hasLogs = cell.logs.length > 0;
              const dayPresents = cell.logs.filter((l) => l.status === 'Present').length;
              const dayAbsents = cell.logs.filter((l) => l.status === 'Absent').length;
              const dayCancelled = cell.logs.filter((l) => l.status === 'Cancelled').length;

              // Compute background tint based on performance
              let bgStyle = cell.isCurrentMonth ? 'var(--bg-subtle)' : 'var(--bg-page)';
              let borderStyle = isSelected
                ? '2px solid var(--primary)'
                : isToday
                ? '2px solid var(--accent)'
                : '1px solid var(--border)';

              if (hasLogs) {
                if (dayAbsents > 0 && dayPresents === 0) {
                  bgStyle = 'var(--danger-bg)';
                } else if (dayPresents > 0 && dayAbsents === 0) {
                  bgStyle = 'var(--safe-bg)';
                } else if (dayPresents > 0 && dayAbsents > 0) {
                  bgStyle = 'var(--warning-bg)';
                } else if (dayCancelled > 0 && dayPresents === 0 && dayAbsents === 0) {
                  bgStyle = 'var(--cancelled-bg)';
                }
              }

              return (
                <div
                  key={idx}
                  className="calendar-cell"
                  onClick={() => setSelectedDayCell(cell)}
                  style={{
                    background: bgStyle,
                    border: borderStyle,
                    opacity: cell.isCurrentMonth ? 1 : 0.45
                  }}
                >
                  <div className="calendar-cell-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: isToday || isSelected ? 800 : 600,
                        color: isSelected ? 'var(--primary)' : isToday ? 'var(--accent)' : 'var(--text-main)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: isToday ? '20px' : 'auto',
                        height: isToday ? '20px' : 'auto',
                        borderRadius: isToday ? '50%' : '0',
                        background: isToday ? 'var(--accent-subtle)' : 'transparent'
                      }}
                    >
                      {cell.dayNum}
                    </span>

                    {hasLogs && (
                      <span className="calendar-cell-count-text" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                        {cell.logs.length} class{cell.logs.length > 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>

                  {/* Desktop Badges (Full text) */}
                  <div className="calendar-badge-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                    {cell.logs.slice(0, 3).map((l, lIdx) => (
                      <div
                        key={lIdx}
                        title={`${l.subjectId?.name || 'Subject'}: ${l.status}${l.notes ? ` (${l.notes})` : ''}`}
                        style={{
                          fontSize: '10px',
                          padding: '2px 4px',
                          borderRadius: '3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: 600,
                          background:
                            l.status === 'Present'
                              ? 'var(--safe-bg)'
                              : l.status === 'Absent'
                              ? 'var(--danger-bg)'
                              : 'var(--cancelled-bg)',
                          color:
                            l.status === 'Present'
                              ? 'var(--safe-text)'
                              : l.status === 'Absent'
                              ? 'var(--danger-text)'
                              : 'var(--cancelled-text)',
                          border:
                            l.status === 'Present'
                              ? '1px solid var(--safe-border)'
                              : l.status === 'Absent'
                              ? '1px solid var(--danger-border)'
                              : '1px solid var(--cancelled-border)'
                        }}
                      >
                        {l.status === 'Present' ? '✓' : l.status === 'Absent' ? '✕' : '—'}{' '}
                        {l.subjectId?.code || l.subjectId?.name || 'Class'}
                      </div>
                    ))}
                    {cell.logs.length > 3 && (
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 700 }}>
                        +{cell.logs.length - 3} more
                      </div>
                    )}
                  </div>

                  {/* Mobile Indicator Dots (Neat & Clean for phones) */}
                  <div className="calendar-dots-mobile">
                    {cell.logs.slice(0, 4).map((l, lIdx) => (
                      <span
                        key={lIdx}
                        className="calendar-dot"
                        style={{
                          background:
                            l.status === 'Present'
                              ? 'var(--safe-text)'
                              : l.status === 'Absent'
                              ? 'var(--danger-text)'
                              : 'var(--cancelled-text)'
                        }}
                      />
                    ))}
                    {cell.logs.length > 4 && (
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-muted)' }}>+</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Day Details Inspector (Especially helpful on Mobile) */}
          {selectedDayCell && (
            <div style={{ marginTop: '20px', padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  📌 Sessions on {formatDateDisplay(selectedDayCell.date)} ({selectedDayCell.logs.length} logged)
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDayCell(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              {selectedDayCell.logs.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No attendance logs recorded on this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDayCell.logs.map((log) => {
                    const statusClass =
                      log.status === 'Present'
                        ? 'badge-safe'
                        : log.status === 'Absent'
                        ? 'badge-danger'
                        : 'badge-cancelled';

                    return (
                      <div
                        key={log._id}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {log.subjectId?.name} ({log.subjectId?.code || '—'})
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                            <span>{log.subjectId?.faculty ? `Prof: ${log.subjectId.faculty}` : log.subjectId?.type || 'Lecture'}</span>
                            <span
                              onClick={() => openHistoryNoteModal(log)}
                              style={{
                                cursor: 'pointer',
                                color: log.notes ? 'var(--primary)' : 'var(--text-dim)',
                                background: 'var(--bg-card)',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                fontSize: '10.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Click to add or edit note"
                            >
                              <span>{log.notes ? `📝 "${log.notes}"` : '➕ Add Note'}</span>
                              <span style={{ fontSize: '9px', opacity: 0.7 }}>✏️</span>
                            </span>
                          </div>
                        </div>
                        <span className={`badge-pill ${statusClass}`}>
                          {log.status === 'Present' && '✓ '}
                          {log.status === 'Absent' && '✕ '}
                          {log.status === 'Cancelled' && '— '}
                          {log.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Timeline List View */
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Semester Attendance Ledger ({logs.length} entries)
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Sorted reverse chronologically
            </span>
          </div>

          {logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No attendance logs found matching the selected criteria.
            </div>
          ) : (
            <>
              {/* Desktop Ledger Table */}
              <div className="history-desktop-table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <th style={{ padding: '10px 16px' }}>Date</th>
                      <th style={{ padding: '10px 16px' }}>Subject</th>
                      <th style={{ padding: '10px 16px' }}>Code / Type</th>
                      <th style={{ padding: '10px 16px' }}>Faculty</th>
                      <th style={{ padding: '10px 16px' }}>Status</th>
                      <th style={{ padding: '10px 16px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const statusClass =
                        log.status === 'Present'
                          ? 'badge-safe'
                          : log.status === 'Absent'
                          ? 'badge-danger'
                          : 'badge-cancelled';

                      return (
                        <tr
                          key={log._id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.1s ease'
                          }}
                        >
                          <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            {formatDateDisplay(log.date)}
                          </td>
                          <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {log.subjectId?.name || 'Deleted Subject'}
                          </td>
                          <td style={{ padding: '11px 16px', color: 'var(--text-muted)' }}>
                            {log.subjectId?.code || '—'} • {log.subjectId?.type || 'Lecture'}
                          </td>
                          <td style={{ padding: '11px 16px', color: 'var(--text-muted)' }}>
                            {log.subjectId?.faculty || '—'}
                          </td>
                          <td style={{ padding: '11px 16px' }}>
                            <span className={`badge-pill ${statusClass}`}>
                              {log.status === 'Present' && '✓ '}
                              {log.status === 'Absent' && '✕ '}
                              {log.status === 'Cancelled' && '— '}
                              {log.status}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '11px 16px',
                              cursor: 'pointer'
                            }}
                            onClick={() => openHistoryNoteModal(log)}
                            title="Click to add or edit note"
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: log.notes ? 'var(--bg-subtle)' : 'transparent',
                                border: log.notes ? '1px solid var(--border)' : '1px dashed var(--border)',
                                color: log.notes ? 'var(--text-main)' : 'var(--text-dim)',
                                fontSize: '11.5px',
                                fontStyle: log.notes ? 'normal' : 'italic'
                              }}
                            >
                              <span>{log.notes ? `📝 ${log.notes}` : '+ Add note'}</span>
                              <span style={{ fontSize: '10px', opacity: 0.6 }}>✏️</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Timeline Cards */}
              <div className="history-mobile-cards">
                {logs.map((log) => {
                  const statusClass =
                    log.status === 'Present'
                      ? 'badge-safe'
                      : log.status === 'Absent'
                      ? 'badge-danger'
                      : 'badge-cancelled';

                  const cardClass =
                    log.status === 'Present'
                      ? 'status-present'
                      : log.status === 'Absent'
                      ? 'status-absent'
                      : 'status-cancelled';

                  return (
                    <div key={log._id} className={`history-log-card ${cardClass}`}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          📅 {formatDateDisplay(log.date)}
                        </span>
                        <span className={`badge-pill ${statusClass}`}>
                          {log.status === 'Present' && '✓ '}
                          {log.status === 'Absent' && '✕ '}
                          {log.status === 'Cancelled' && '— '}
                          {log.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.25' }}>
                        {log.subjectId?.name || 'Deleted Subject'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                        {log.subjectId?.code && <span className="course-code-tag">{log.subjectId.code}</span>}
                        <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>
                          {log.subjectId?.type || 'Lecture'}
                        </span>
                        {log.subjectId?.faculty && (
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            • {log.subjectId.faculty}
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() => openHistoryNoteModal(log)}
                        style={{
                          fontSize: '11.5px',
                          color: log.notes ? 'var(--text-main)' : 'var(--text-dim)',
                          fontStyle: log.notes ? 'normal' : 'italic',
                          background: 'var(--bg-subtle)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          border: '1px solid var(--border)',
                          marginTop: '4px'
                        }}
                        title="Click to add or edit note"
                      >
                        <span>{log.notes ? `📝 Note: "${log.notes}"` : '➕ Add Note / Reason'}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>✏️</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* History Note Modal */}
      {editingNoteLog && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => setEditingNoteLog(null)}
        >
          <div
            className="modal-card"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              maxWidth: '460px',
              width: '100%',
              padding: '20px',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📝</span>
                <span>Session Note</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteLog(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--text-main)' }}>{editingNoteLog.subjectId?.name || 'Class'}</strong>
              <span>•</span>
              <span>{formatDateDisplay(editingNoteLog.date)}</span>
              <span>•</span>
              <span className={`badge-pill ${editingNoteLog.status === 'Present' ? 'badge-safe' : editingNoteLog.status === 'Absent' ? 'badge-danger' : 'badge-cancelled'}`}>
                {editingNoteLog.status}
              </span>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {['🤒 Medical / Sick', '🏆 On Duty (OD)', '🚫 Prof Cancelled', '📝 Quiz / Exam', '🚗 Family / Travel'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHistoryNoteText(preset)}
                  className="preset-chip"
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    background: historyNoteText === preset ? 'var(--primary-subtle, rgba(59, 130, 246, 0.15))' : 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              value={historyNoteText}
              onChange={(e) => setHistoryNoteText(e.target.value)}
              placeholder="e.g. Medical leave, On duty event, Class cancelled by faculty..."
              maxLength={200}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                fontSize: '13px',
                resize: 'none',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              {editingNoteLog.notes ? (
                <button
                  type="button"
                  onClick={clearHistoryNote}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '6px 8px'
                  }}
                >
                  🗑️ Clear Note
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingNoteLog(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveHistoryNote}
                  disabled={savingHistoryNote}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--primary, #3b82f6)',
                    color: '#fff',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  {savingHistoryNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
