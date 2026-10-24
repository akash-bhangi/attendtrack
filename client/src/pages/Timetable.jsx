import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { formatTime12h } from '../utils/formatters';
import './Timetable.css';

export default function Timetable() {
  const notify = useNotification();
  const [timetable, setTimetable] = useState({ raw: [], byDay: {} });
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Modals
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // New slot form
  const [slotForm, setSlotForm] = useState({
    subjectId: '',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    room: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [ttRes, subRes] = await Promise.all([
        api.get('/timetable'),
        api.get('/subjects')
      ]);
      if (ttRes.success) setTimetable(ttRes.data);
      if (subRes.success) {
        setSubjects(subRes.data);
        if (subRes.data.length > 0 && !slotForm.subjectId) {
          setSlotForm((prev) => ({ ...prev, subjectId: subRes.data[0]._id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/timetable/slot', slotForm);
      notify.success('Timetable slot added successfully!', 'Slot Added');
      setShowSlotModal(false);
      loadData();
    } catch (err) {
      notify.error('Error adding slot: ' + err.message, 'Slot Error');
    }
  };

  const handleDeleteSlot = async (id) => {
    const confirmed = await notify.confirm({
      title: 'Remove Timetable Slot',
      message: 'Are you sure you want to remove this slot from the timetable?',
      confirmText: 'Remove Slot',
      cancelText: 'Cancel',
      isDanger: true
    });

    if (confirmed) {
      try {
        await api.delete(`/timetable/slot/${id}`);
        notify.success('Timetable slot removed.', 'Slot Removed');
        loadData();
      } catch (err) {
        notify.error('Failed to delete slot: ' + err.message, 'Delete Failed');
      }
    }
  };

  // AI Scanner upload handler
  const handleAIScan = async (e) => {
    e.preventDefault();
    if (!scanFile) {
      notify.warning('Please select an image or PDF of your timetable.', 'File Required');
      return;
    }

    setScanning(true);
    const formData = new FormData();
    formData.append('timetableFile', scanFile);

    try {
      const res = await api.postForm('/timetable/scan-ai', formData);
      if (res.success) {
        setScanResult(res.data);
      }
    } catch (err) {
      notify.error('AI Scan failed: ' + err.message, 'Scan Failed');
    } finally {
      setScanning(false);
    }
  };

  const handleResetAttendance = async () => {
    const confirmed = await notify.confirm({
      title: 'Reset All Course Attendance to 0',
      message: 'Reset all attendance records to 0? This will wipe previous attendance marks and start fresh from 0 for all courses.',
      confirmText: 'Reset to 0',
      cancelText: 'Cancel',
      isDanger: true
    });

    if (confirmed) {
      try {
        const res = await api.post('/attendance/reset', {});
        if (res.success) {
          notify.success('Attendance reset complete: all courses now show 0 attended / 0 conducted.', 'Attendance Reset');
          loadData();
        }
      } catch (err) {
        notify.error('Failed to reset attendance: ' + err.message, 'Reset Failed');
      }
    }
  };

  // Apply scanned slots into database (automatically purges all old timetable records across collections)
  const applyScannedTimetable = async () => {
    if (!scanResult) return;
    try {
      // 1. Create any missing subjects first
      const existingNames = new Set(subjects.map((s) => s.name.trim().toLowerCase()));
      const subjectMap = {};
      subjects.forEach((s) => {
        const nameKey = s.name.trim().toLowerCase();
        subjectMap[nameKey] = s._id;
        if (s.code) subjectMap[s.code.trim().toLowerCase()] = s._id;
      });

      for (const det of scanResult.detectedSubjects || []) {
        if (!det.name) continue;
        const key = det.name.trim().toLowerCase();
        if (!existingNames.has(key)) {
          const newSub = await api.post('/subjects', {
            name: det.name.trim(),
            code: det.code ? det.code.trim() : '',
            type: det.type || 'Theory',
            faculty: det.faculty ? det.faculty.trim() : '',
            totalConducted: 0,
            totalAttended: 0
          });
          if (newSub.success && newSub.data) {
            existingNames.add(key);
            subjectMap[key] = newSub.data._id;
            if (newSub.data.code) {
              subjectMap[newSub.data.code.trim().toLowerCase()] = newSub.data._id;
            }
          }
        }
      }

      // 2. Map slots to subject IDs and bulk save
      const slotsToSave = [];
      for (const slot of scanResult.slots || []) {
        const slotKey = (slot.subjectName || '').trim().toLowerCase();
        let subId = subjectMap[slotKey];
        if (!subId) {
          const match = Object.entries(subjectMap).find(([k]) => k.includes(slotKey) || slotKey.includes(k));
          if (match) subId = match[1];
        }

        if (subId) {
          slotsToSave.push({
            subjectId: subId,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room || ''
          });
        }
      }

      if (slotsToSave.length > 0) {
        const res = await api.post('/timetable/bulk', {
          slots: slotsToSave,
          replaceExisting: true,
          resetAttendance: true,
          clearOldSubjects: true
        });
        notify.success(
          res.message || `Successfully imported ${slotsToSave.length} schedule slots!`,
          'Timetable Imported'
        );
        setShowScanModal(false);
        setScanResult(null);
        setScanFile(null);
        loadData();
      } else {
        notify.warning('No matching slots found to import.', 'Import Notice');
      }
    } catch (err) {
      notify.error('Error importing timetable: ' + err.message, 'Import Failed');
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentSlots = timetable.byDay[selectedDay] || [];

  return (
    <div className="content-container">
      {/* Complete Timetable Card */}
      <div className="card-panel">
        <div className="timetable-card-header">
          <div>
            <h2 className="card-panel-title">Academic Timetable Matrix</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Weekly class timetable & room mapping
            </span>
          </div>
          <div className="timetable-header-actions">
            <button className="btn-secondary" onClick={handleResetAttendance} title="Reset all subjects to 0/0 attendance">
              🔄 Reset to 0
            </button>
            <button className="btn-secondary" onClick={() => setShowScanModal(true)}>
              📷 Scan AI
            </button>
            <button className="btn-primary" onClick={() => setShowSlotModal(true)}>
              + Add Slot
            </button>
          </div>
        </div>

        {/* Day Selector Chips */}
        <div className="timetable-day-strip">
          {(() => {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayDayName = dayNames[new Date().getDay()];
            return daysOfWeek.map((day) => {
              const count = (timetable.byDay[day] || []).length;
              const isActive = selectedDay === day;
              const isToday = day === todayDayName;
              return (
                <div
                  key={day}
                  className={`timetable-day-chip ${isActive ? 'active' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => setSelectedDay(day)}
                  title={isToday ? 'Today (Present Day)' : day}
                >
                  {isToday && <span className="today-dot">TODAY</span>}
                  <span className="day-name">{day.slice(0, 3)}</span>
                  <span className="slot-count">
                    {count}
                    <span className="slot-count-label"> {count === 1 ? 'Slot' : 'Slots'}</span>
                  </span>
                </div>
              );
            });
          })()}
        </div>

        {/* Schedule Slot List for Selected Day */}
        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading timetable...
          </div>
        ) : currentSlots.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 700 }}>
              No classes mapped for {selectedDay}
            </h3>
            <p style={{ fontSize: '12px', marginTop: '6px' }}>
              Add individual lecture/lab slots or scan your printed timetable with AI!
            </p>
            <button
              className="btn-primary"
              style={{ marginTop: '14px' }}
              onClick={() => {
                setSlotForm((prev) => ({ ...prev, dayOfWeek: selectedDay }));
                setShowSlotModal(true);
              }}
            >
              + Add Slot for {selectedDay}
            </button>
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="timetable-desktop-table" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time Slot</th>
                    <th>Course Title</th>
                    <th>Type</th>
                    <th>Faculty</th>
                    <th>Room / Location</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSlots.map((slot) => {
                    const sub = slot.subject;
                    return (
                      <tr key={slot.id}>
                        <td style={{ fontWeight: 600 }}>
                          {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                        </td>
                        <td>
                          <strong>{sub ? sub.name : 'Unknown'}</strong>{' '}
                          {sub?.code && <span className="course-code-tag">{sub.code}</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {sub?.type || 'Theory'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {sub?.faculty || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {slot.room ? `Room ${slot.room}` : '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-mark"
                            style={{
                              padding: '5px 12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: 'var(--danger-text)',
                              background: 'var(--danger-bg)',
                              border: '1.5px solid var(--danger-border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onClick={() => handleDeleteSlot(slot.id)}
                            title="Remove this slot"
                          >
                            <span>🗑️</span>
                            <span>Remove</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View Responsive Cards */}
            <div className="timetable-mobile-cards">
              {currentSlots.map((slot) => {
                const sub = slot.subject;
                return (
                  <div key={slot.id} className="timetable-mobile-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                        🕒 {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(slot.id)}
                        style={{
                          background: 'var(--danger-bg)',
                          border: '1.5px solid var(--danger-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--danger-text)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '4px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <span>🗑️</span>
                        <span>Remove</span>
                      </button>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {sub ? sub.name : 'Unknown Course'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                      {sub?.code && <span className="course-code-tag">{sub.code}</span>}
                      <span className="badge-pill badge-neutral">{sub?.type || 'Theory'}</span>
                      {slot.room && <span className="course-room-tag">Room {slot.room}</span>}
                    </div>

                    {sub?.faculty && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Instructor: <strong>{sub.faculty}</strong>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Manual Slot Modal */}
      {showSlotModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>
              Add Timetable Period Slot
            </h3>
            <form onSubmit={handleAddSlot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Select Course *
                </label>
                {subjects.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--danger-text)' }}>
                    No subjects found. Please add a course in the Courses tab first!
                  </p>
                ) : (
                  <select
                    value={slotForm.subjectId}
                    onChange={(e) => setSlotForm({ ...slotForm, subjectId: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} {s.code ? `(${s.code})` : ''} — {s.type}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="timetable-modal-grid">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Day of the Week
                  </label>
                  <select
                    value={slotForm.dayOfWeek}
                    onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    {daysOfWeek.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Classroom / Lab Room
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 402 or Systems Lab"
                    value={slotForm.room}
                    onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="timetable-modal-grid">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Start Time ({formatTime12h(slotForm.startTime)})
                  </label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    End Time ({formatTime12h(slotForm.endTime)})
                  </label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSlotModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={subjects.length === 0}>
                  Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Timetable Scanner Modal */}
      {showScanModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '8px' }}>
              Gemini Vision AI Timetable Scanner
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Upload a photograph or PDF of your university timetable. Gemini Vision automatically reads period timings, course codes, and days of the week.
            </p>

            {!scanResult ? (
              <form onSubmit={handleAIScan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    border: '2px dashed var(--border-darker)',
                    borderRadius: 'var(--radius-md)',
                    padding: '28px',
                    textAlign: 'center',
                    background: 'var(--bg-subtle)'
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setScanFile(e.target.files[0])}
                    style={{ display: 'none' }}
                    id="timetable-file-input"
                  />
                  <label htmlFor="timetable-file-input" style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '28px' }}>📄</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '8px' }}>
                      {scanFile ? scanFile.name : 'Click to select Timetable Image or PDF'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supports JPEG, PNG, WEBP, or PDF (up to 10MB)
                    </div>
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowScanModal(false)}>
                    Close
                  </button>
                  <button type="submit" className="btn-primary" disabled={scanning || !scanFile}>
                    {scanning ? 'AI is extracting timetable...' : 'Scan with Gemini AI'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ background: 'var(--safe-bg)', border: '1px solid var(--safe-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '14px' }}>
                  <strong style={{ color: 'var(--safe-text)', fontSize: '12px' }}>
                    ✓ Extraction Complete!
                  </strong>
                  <div style={{ fontSize: '12px', color: 'var(--safe-text)', marginTop: '2px' }}>
                    Found {scanResult.detectedSubjects?.length || 0} subjects and {scanResult.slots?.length || 0} scheduled class periods.
                  </div>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', fontSize: '12px' }}>
                  <strong>Parsed Slots:</strong>
                  <ul style={{ paddingLeft: '16px', marginTop: '6px', color: 'var(--text-muted)' }}>
                    {scanResult.slots?.map((s, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        <strong>{s.dayOfWeek}</strong> ({formatTime12h(s.startTime)} – {formatTime12h(s.endTime)}): {s.subjectName} {s.room ? `[Room ${s.room}]` : ''}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: '12px', background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🧹</span> Automatic Database Optimization
                  </div>
                  Saving this timetable will automatically delete all old schedule slots, obsolete courses, and previous attendance records across all database collections so no stale data remains in storage.
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setScanResult(null);
                      setScanFile(null);
                    }}
                  >
                    Re-scan
                  </button>
                  <button type="button" className="btn-primary" onClick={applyScannedTimetable}>
                    Confirm & Save to Timetable
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
