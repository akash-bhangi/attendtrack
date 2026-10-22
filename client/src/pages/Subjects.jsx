import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './Subjects.css';

export default function Subjects() {
  const { user } = useAuth();
  const notify = useNotification();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'Theory',
    faculty: '',
    totalConducted: 0,
    totalAttended: 0
  });

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subjects');
      if (res.success) setSubjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const openAddModal = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      type: 'Theory',
      faculty: '',
      totalConducted: 0,
      totalAttended: 0
    });
    setShowModal(true);
  };

  const openEditModal = (sub) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      type: sub.type,
      faculty: sub.faculty,
      totalConducted: sub.totalConducted,
      totalAttended: sub.totalAttended
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, formData);
        notify.success(`Subject "${formData.name}" updated successfully!`, 'Subject Saved');
      } else {
        await api.post('/subjects', formData);
        notify.success(`Subject "${formData.name}" added successfully!`, 'Subject Created');
      }
      setShowModal(false);
      loadSubjects();
    } catch (err) {
      notify.error('Error saving subject: ' + err.message, 'Save Failed');
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await notify.confirm({
      title: 'Delete Subject',
      message: `Are you sure you want to remove "${name}" and all its scheduled timetable slots? This action cannot be undone.`,
      confirmText: 'Delete Subject',
      cancelText: 'Cancel',
      isDanger: true
    });

    if (confirmed) {
      try {
        await api.delete(`/subjects/${id}`);
        notify.success(`Subject "${name}" has been removed.`, 'Subject Deleted');
        loadSubjects();
      } catch (err) {
        notify.error('Failed to delete subject: ' + err.message, 'Delete Failed');
      }
    }
  };

  const handleResetAttendance = async () => {
    const confirmed = await notify.confirm({
      title: 'Reset All Course Attendance to 0',
      message: 'This will reset attendance counts to 0 attended / 0 conducted for all courses and clear existing attendance history. Ideal for mid-semester or new semester starts.',
      confirmText: 'Reset to 0',
      cancelText: 'Keep Current',
      isDanger: true
    });

    if (confirmed) {
      try {
        const res = await api.post('/attendance/reset', {});
        if (res.success) {
          notify.success('Attendance reset complete: all courses now show 0 attended / 0 conducted.', 'Attendance Reset');
          loadSubjects();
        }
      } catch (err) {
        notify.error('Failed to reset attendance: ' + err.message, 'Reset Failed');
      }
    }
  };

  return (
    <div className="content-container">
      <div className="card-panel">
        <div className="courses-card-header">
          <div>
            <h2 className="card-panel-title">Registered Courses & 75% Audit</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Threshold: {user?.targetPercentage || 75}% mandatory attendance
            </span>
          </div>
          <div className="courses-header-actions">
            <button className="btn-secondary" onClick={handleResetAttendance} title="Reset all attendance to 0">
              🔄 Reset to 0
            </button>
            <button className="btn-primary" onClick={openAddModal}>
              + Add Course
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading course register...
          </div>
        ) : subjects.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '15px', fontWeight: 700 }}>No courses registered yet</h3>
            <p style={{ fontSize: '12px', marginTop: '6px' }}>
              Add your subjects manually or upload your timetable photo in the Schedule tab!
            </p>
            <button className="btn-primary" style={{ marginTop: '16px' }} onClick={openAddModal}>
              + Add First Course
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="courses-desktop-table" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Title</th>
                    <th>Type</th>
                    <th>Faculty</th>
                    <th>Attended / Held</th>
                    <th>Current %</th>
                    <th>Compliance Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub) => {
                    const targetThreshold = user?.targetPercentage || 75;
                    const isSafe = sub.percentage >= targetThreshold;
                    return (
                      <tr key={sub._id}>
                        <td>
                          <span className="course-code-tag">{sub.code || '—'}</span>
                        </td>
                        <td>
                          <strong>{sub.name}</strong>
                        </td>
                        <td>
                          <span className="badge-pill badge-neutral" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {sub.type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub.faculty || '—'}</span>
                        </td>
                        <td className="tabular" style={{ fontWeight: 600 }}>
                          {sub.totalAttended} / {sub.totalConducted}
                        </td>
                        <td
                          className="tabular"
                          style={{
                            fontWeight: 800,
                            fontSize: '14px',
                            color: isSafe ? 'var(--safe-text)' : 'var(--danger-text)'
                          }}
                        >
                          {sub.percentage}%
                        </td>
                        <td>
                          {isSafe ? (
                            <div>
                              <span className="badge-pill badge-safe" title={`Safe to miss ${sub.safeBunks} classes`}>
                                🛡️ Safe (+{sub.safeBunks} {sub.safeBunks === 1 ? 'bunk' : 'bunks'})
                              </span>
                              <div className="mini-progress-track" style={{ width: '110px' }}>
                                <div
                                  className="mini-progress-fill safe"
                                  style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="badge-pill badge-danger" title={`Must attend next ${sub.classesNeeded} classes`}>
                                ⚠️ Deficit (Need {sub.classesNeeded})
                              </span>
                              <div className="mini-progress-track" style={{ width: '110px' }}>
                                <div
                                  className="mini-progress-fill danger"
                                  style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(sub)}
                            className="table-action-btn edit-btn"
                            title="Edit course details"
                            style={{ marginRight: '6px' }}
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sub._id, sub.name)}
                            className="table-action-btn delete-btn"
                            title="Delete course from database"
                          >
                            <span>🗑️</span>
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="courses-mobile-cards">
              {subjects.map((sub) => {
                const targetThreshold = user?.targetPercentage || 75;
                const isSafe = sub.percentage >= targetThreshold;

                return (
                  <div key={sub._id} className={`course-register-card ${isSafe ? 'is-safe' : 'is-deficit'}`}>
                    <div className="course-register-card-top">
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.25' }}>
                          {sub.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {sub.code && <span className="course-code-tag">{sub.code}</span>}
                          <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>
                            {sub.type || 'Theory'}
                          </span>
                          {sub.faculty && (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              • {sub.faculty}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: isSafe ? 'var(--safe-text)' : 'var(--danger-text)'
                          }}
                        >
                          {sub.percentage}%
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {sub.totalAttended}/{sub.totalConducted} classes
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Compliance Pill */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        {isSafe ? (
                          <span className="badge-pill badge-safe" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            🛡️ Safe (+{sub.safeBunks} {sub.safeBunks === 1 ? 'bunk' : 'bunks'})
                          </span>
                        ) : (
                          <span className="badge-pill badge-danger" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            ⚠️ Recover (Need {sub.classesNeeded})
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target: {targetThreshold}%</span>
                      </div>
                      <div className="mini-progress-track">
                        <div
                          className={`mini-progress-fill ${isSafe ? 'safe' : 'danger'}`}
                          style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="course-register-actions-row">
                      <button
                        type="button"
                        onClick={() => openEditModal(sub)}
                        className="btn-secondary"
                        style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      >
                        ✏️ Edit Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sub._id, sub.name)}
                        className="btn-secondary"
                        style={{ fontSize: '11.5px', padding: '5px 12px', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Course Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>
                <span>{editingSubject ? '✏️ Edit Course Details' : '📚 Add New Academic Course'}</span>
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {(() => {
              const modalConducted = Number(formData.totalConducted) || 0;
              const modalAttended = Number(formData.totalAttended) || 0;
              const modalPct = modalConducted > 0 ? Number(((modalAttended / modalConducted) * 100).toFixed(1)) : 100;
              const targetThreshold = user?.targetPercentage || 75;
              const modalIsSafe = modalPct >= targetThreshold;
              const modalSafeBunks = Math.max(0, Math.floor((4 * modalAttended - 3 * modalConducted) / 3));
              const modalClassesNeeded = Math.max(0, Math.ceil(3 * modalConducted - 4 * modalAttended));

              return (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                      Course Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operating Systems"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                    />
                  </div>

                  <div className="subject-modal-grid">
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Course Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CS-301"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Course Type
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                      >
                        <option value="Theory">Theory</option>
                        <option value="Practical">Practical</option>
                        <option value="Lab">Laboratory</option>
                        <option value="Tutorial">Tutorial</option>
                        <option value="Project">Project</option>
                        <option value="Seminar">Seminar</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Instructor / Faculty Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Prof. R. Sharma"
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                    />
                  </div>

                  <div className="subject-modal-grid">
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Sessions Conducted
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.totalConducted}
                        onChange={(e) => setFormData({ ...formData, totalConducted: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        Sessions Attended
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.totalAttended}
                        onChange={(e) => setFormData({ ...formData, totalAttended: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ width: '100%', padding: '9px 12px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Live Compliance Status Forecast Box */}
                  <div className={`modal-live-preview ${modalIsSafe ? 'is-safe' : 'is-danger'}`}>
                    <div className="modal-live-preview-header">
                      <span className="modal-live-preview-title">
                        ⚡ Real-Time Compliance Forecast
                      </span>
                      <span
                        className="modal-live-preview-pct"
                        style={{ color: modalIsSafe ? 'var(--safe-text)' : 'var(--danger-text)' }}
                      >
                        {modalPct}%
                      </span>
                    </div>
                    <div
                      className="modal-live-preview-desc"
                      style={{ color: modalIsSafe ? 'var(--safe-text)' : 'var(--danger-text)' }}
                    >
                      {modalIsSafe ? (
                        <span>
                          🛡️ <strong>Safe Standing:</strong> You have{' '}
                          <strong>+{modalSafeBunks} safe {modalSafeBunks === 1 ? 'bunk' : 'bunks'}</strong> before dipping below {targetThreshold}%.
                        </span>
                      ) : (
                        <span>
                          ⚠️ <strong>Attendance Deficit:</strong> Must attend the next{' '}
                          <strong>{modalClassesNeeded} consecutive {modalClassesNeeded === 1 ? 'class' : 'classes'}</strong> to recover.
                        </span>
                      )}
                    </div>
                    <div className="mini-progress-track">
                      <div
                        className={`mini-progress-fill ${modalIsSafe ? 'safe' : 'danger'}`}
                        style={{ width: `${Math.min(100, Math.max(0, modalPct))}%` }}
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowModal(false)}
                      style={{ padding: '8px 16px', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ padding: '8px 18px', fontSize: '13px' }}
                    >
                      <span>{editingSubject ? '💾 Update Course' : '✓ Save Course'}</span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
