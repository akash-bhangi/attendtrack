import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { formatTime12h } from '../utils/formatters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './Analytics.css';

export default function Analytics() {
  const { user } = useAuth();
  const notify = useNotification();
  const [summary, setSummary] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);
  const [targetRecipient, setTargetRecipient] = useState('');
  const [dispatchedInfo, setDispatchedInfo] = useState(null);

  useEffect(() => {
    if (user) {
      setTargetRecipient(
        user.notificationEmail ||
        (user.email === 'student.demo@college.edu' ? 'bhangiakash10@gmail.com' : user.email) ||
        ''
      );
    }
  }, [user]);

  // Gemini AI Analytics State
  const [aiInsights, setAiInsights] = useState(() => {
    try {
      const cached = sessionStorage.getItem('attendtrack_ai_insights');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  const loadSummary = async () => {
    try {
      const res = await api.get('/analytics/summary');
      if (res.success) setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateAIInsights = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const res = await api.post('/analytics/ai-insights', {});
      if (res.success) {
        setAiInsights(res.data);
        try {
          sessionStorage.setItem('attendtrack_ai_insights', JSON.stringify(res.data));
        } catch {
          // ignore storage errors
        }
      }
    } catch (err) {
      console.error('AI Insights Error:', err);
      const msg = err.message || '';
      const isRateLimit =
        err.status === 429 ||
        err.data?.isRateLimit ||
        msg.includes('429') ||
        msg.toLowerCase().includes('quota') ||
        msg.includes('RESOURCE_EXHAUSTED');

      setAiError({
        isRateLimit,
        message: err.data?.message || (isRateLimit ? 'Google Gemini daily free quota (20 requests/day) reached for this project.' : msg),
        retryAfter: err.data?.retryAfter || null,
        rawError: err.data?.rawError || msg
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const generateOfflineInsights = () => {
    if (!summary || !summary.subjectBreakdown) return;
    const target = user?.targetPercentage || 75;
    const high = summary.subjectBreakdown.filter((s) => s.safeBunks >= 2);
    const mod = summary.subjectBreakdown.filter((s) => s.safeBunks === 1);
    const zero = summary.subjectBreakdown.filter((s) => s.safeBunks === 0 && s.classesNeeded === 0);
    const deficit = summary.subjectBreakdown.filter((s) => s.classesNeeded > 0);

    let text = `### 1. Overall Standing & Exam Eligibility\n`;
    text += `Your cumulative attendance stands at **${summary.overallPercentage}%** against the required **${target}%** institutional requirement. `;
    if (summary.overallPercentage >= target) {
      text += `You are currently in **Good Academic Standing** and fully eligible for semester examinations.\n\n`;
    } else {
      text += `⚠️ **Shortage Warning:** Your attendance is below ${target}%. Mandatory recovery sessions are required.\n\n`;
    }

    text += `### 2. Urgent Recovery Plan (Courses Below ${target}%)\n`;
    if (deficit.length === 0) {
      text += `🎉 **Clean Sheet:** All registered subjects are currently compliant. No recovery classes needed.\n\n`;
    } else {
      deficit.forEach((s) => {
        text += `- **${s.name} (${s.code || 'N/A'})**: Current: ${s.percentage}% | ⚠️ Deficit: Must attend the next **${s.classesNeeded} consecutive sessions** without missing any.\n`;
      });
      text += `\n`;
    }

    text += `### 3. Safe Bunk Strategy & Cushion Classification\n`;
    if (high.length > 0) {
      text += `#### 🟢 High Margin (2+ Safe Bunks Available)\n`;
      high.forEach((s) => {
        text += `- **${s.name} (${s.code || 'N/A'})**: Current: ${s.percentage}% | Buffer: +${s.safeBunks} classes can be missed safely. Strategic buffer available for midterms or emergencies.\n`;
      });
      text += `\n`;
    }

    if (mod.length > 0) {
      text += `#### 🟡 Moderate Margin (1 Safe Bunk Available)\n`;
      mod.forEach((s) => {
        text += `- **${s.name} (${s.code || 'N/A'})**: Current: ${s.percentage}% | Buffer: +1 class. Reserve strictly for emergencies; a second absence causes deficit.\n`;
      });
      text += `\n`;
    }

    if (zero.length > 0) {
      text += `#### 🔴 Zero Margin / Danger Zone (0 Safe Bunks)\n`;
      zero.forEach((s) => {
        text += `- **${s.name} (${s.code || 'N/A'})**: Current: ${s.percentage}% | Buffer: 0 classes. Attendance will drop below threshold on the very next absence.\n`;
      });
      text += `\n`;
    }

    text += `### 4. Tactical Action Items for This Week\n`;
    text += `1. Prioritize zero-margin classes to prevent slipping below ${target}% on single absences.\n`;
    text += `2. If any practical/lab sessions are scheduled this week, attend without fail as labs carry heavier per-session percentage impact.\n`;
    text += `3. Save high-margin buffers (+2) for end-of-semester study days rather than routine absences.\n`;

    setAiInsights({
      standing: summary.overallPercentage >= target ? 'Compliant' : 'Shortage Alert',
      overallPercentage: summary.overallPercentage,
      atRiskCount: deficit.length,
      aiAnalysis: text,
      modelUsed: 'AttendTrack Offline Analytics Engine',
      generatedAt: new Date()
    });
    setAiError(null);
  };

  useEffect(() => {
    loadSummary();
    if (!aiInsights) {
      generateAIInsights();
    }
  }, []);

  const handleTestEmail = async () => {
    setSendingEmail(true);
    setEmailPreviewUrl(null);
    setDispatchedInfo(null);
    try {
      const res = await api.post('/analytics/send-test-email', {
        recipientEmail: targetRecipient.trim()
      });
      if (res.success) {
        if (res.data?.previewUrl) {
          setEmailPreviewUrl(res.data.previewUrl);
        }
        setDispatchedInfo(res.data);
        notify.success(res.message || `Test attendance digest dispatched for ${targetRecipient}!`, 'Email Dispatched');
      }
    } catch (err) {
      notify.error('Failed to send test email: ' + err.message, 'Email Dispatch Failed');
    } finally {
      setSendingEmail(false);
    }
  };

  // Helper to render bold and italic markdown
  const renderFormattedText = (str) => {
    if (!str) return str;
    const boldParts = str.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length >= 4) {
        return (
          <strong key={bIdx} style={{ color: 'var(--text-main)', fontWeight: 700 }}>
            {bPart.slice(2, -2)}
          </strong>
        );
      }
      const italicParts = bPart.split(/(\*.*?\*)/g);
      return italicParts.map((iPart, iIdx) => {
        if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length >= 2) {
          return (
            <em key={`${bIdx}-${iIdx}`} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {iPart.slice(1, -1)}
            </em>
          );
        }
        return iPart;
      });
    });
  };

  // Helper to render simple markdown sections with tier classifications
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} style={{ height: '8px' }} />;
      }

      // Check for Major Section Headers (### 1., ### 2., etc.)
      if (trimmed.startsWith('### ')) {
        const title = trimmed.replace('### ', '');
        return (
          <div
            key={idx}
            style={{
              fontSize: '15px',
              fontWeight: 800,
              marginTop: '22px',
              marginBottom: '10px',
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {title}
          </div>
        );
      }

      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} style={{ fontSize: '16px', fontWeight: 800, marginTop: '20px', marginBottom: '8px', color: 'var(--text-main)' }}>
            {trimmed.replace('## ', '')}
          </h3>
        );
      }

      // Check for Tier Classification Sub-Headers:
      // Matches '#### 🟢...', 'High Margin...', 'Moderate Margin...', 'Zero Margin...', 'Deficit Zone...'
      const isTierHeader =
        trimmed.startsWith('#### ') ||
        /^(🟢|🟡|🔴|⚠️)?\s*(High Margin|Moderate Margin|Zero Margin|High Cushion|Moderate Cushion|Zero Cushion|Deficit Zone|Low Cushion)/i.test(trimmed) ||
        (trimmed.endsWith(':') && (trimmed.includes('Margin') || trimmed.includes('Bunk')));

      if (isTierHeader) {
        const cleanTitle = trimmed
          .replace(/^####\s*/, '')
          .replace(/:$/, '')
          .trim();

        const lower = cleanTitle.toLowerCase();
        let bg = 'var(--bg-card-hover)';
        let border = 'var(--border)';
        let color = 'var(--text-main)';
        let icon = '🏷️';

        if (lower.includes('high') || lower.includes('🟢')) {
          bg = 'var(--safe-bg)';
          border = 'var(--safe-border)';
          color = 'var(--safe-text)';
          icon = '🟢';
        } else if (lower.includes('moderate') || lower.includes('🟡')) {
          bg = 'var(--warning-bg)';
          border = 'var(--warning-border)';
          color = 'var(--warning-text)';
          icon = '🟡';
        } else if (lower.includes('zero') || lower.includes('danger') || lower.includes('🔴')) {
          bg = 'var(--danger-bg)';
          border = 'var(--danger-border)';
          color = 'var(--danger-text)';
          icon = '🔴';
        } else if (lower.includes('deficit') || lower.includes('⚠️')) {
          bg = 'var(--danger-bg)';
          border = 'var(--danger-border)';
          color = 'var(--danger-text)';
          icon = '⚠️';
        }

        return (
          <div
            key={idx}
            style={{
              fontSize: '13px',
              fontWeight: 800,
              marginTop: '16px',
              marginBottom: '8px',
              color: color,
              padding: '8px 12px',
              background: bg,
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{icon}</span>
            <span>{cleanTitle.replace(/^(\u{1F7E2}|\u{1F7E1}|\u{1F534}|\u{26A0}\u{FE0F}?)\s*/u, '')}</span>
          </div>
        );
      }

      // Check for Course Items:
      // Either starts with bullet (- or *) OR contains a course pattern like 'Data Processing (ISC302A): 91.7%'
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      const content = isBullet ? trimmed.substring(2) : trimmed;
      const isCourseLine = /\(.*?\):.*?(%|classes|bunk)/i.test(content) || (content.includes('|') && content.includes('%'));

      if (isCourseLine) {
        return (
          <div
            key={idx}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '9px 12px',
              marginBottom: '6px',
              fontSize: '13px',
              lineHeight: '1.55',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>▸</span>
            <div style={{ flex: 1 }}>{renderFormattedText(content)}</div>
          </div>
        );
      }

      if (isBullet) {
        return (
          <li key={idx} style={{ marginLeft: '18px', marginBottom: '6px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-main)' }}>
            {renderFormattedText(content)}
          </li>
        );
      }

      // Numbered List Items (e.g. 1. , 2. )
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <div
            key={idx}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: '8px',
              fontSize: '13px',
              lineHeight: '1.55'
            }}
          >
            {renderFormattedText(trimmed)}
          </div>
        );
      }

      return (
        <p key={idx} style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '8px', color: 'var(--text-main)' }}>
          {renderFormattedText(trimmed)}
        </p>
      );
    });
  };

  // Export PDF with jsPDF & AutoTable
  const exportPDF = () => {
    if (!summary || !summary.subjectBreakdown) return;

    const doc = new jsPDF();

    // Document Header
    doc.setFontSize(18);
    doc.text('AttendTrack — Official Attendance Audit Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Student: ${user?.name || 'Student'} (${user?.email || 'N/A'})`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, 14, 34);
    doc.text(`Institutional Requirement: Minimum ${user?.targetPercentage || 75}.0% Attendance`, 14, 40);

    // Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 46, 182, 22, 'FD');

    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(`Overall Percentage: ${summary.overallPercentage}%`, 20, 56);
    doc.text(`Attendance Ratio: ${summary.totalAttended} / ${summary.totalConducted} classes attended`, 20, 62);
    doc.text(
      `Compliance Standing: ${summary.isCompliant ? 'COMPLIANT' : 'SHORTAGE ALERT'}`,
      115,
      56
    );
    doc.text(
      summary.overallSafeBunks > 0
        ? `Safe Bunk Buffer: +${summary.overallSafeBunks} classes`
        : `Mandatory Recovery: Attend next ${summary.overallClassesNeeded} classes`,
      115,
      62
    );

    // Table Data
    const tableRows = summary.subjectBreakdown.map((s) => [
      s.code || '—',
      s.name,
      s.type,
      s.faculty || '—',
      s.totalAttended,
      s.totalConducted,
      `${s.percentage}%`,
      s.percentage >= 75 ? `Safe (+${s.safeBunks})` : `Need ${s.classesNeeded}`
    ]);

    autoTable(doc, {
      startY: 74,
      head: [['Code', 'Course Name', 'Type', 'Faculty', 'Attended', 'Held', 'Rate', '75% Status']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 }
    });

    doc.save(`Attendance_Report_${user?.name?.replace(/\s+/g, '_') || 'Student'}.pdf`);
  };

  // Export Excel (.xlsx)
  const exportExcel = () => {
    if (!summary || !summary.subjectBreakdown) return;

    const dataToExport = summary.subjectBreakdown.map((s) => ({
      'Course Code': s.code || 'N/A',
      'Course Name': s.name,
      'Type': s.type,
      'Faculty': s.faculty || 'N/A',
      'Sessions Conducted': s.totalConducted,
      'Sessions Attended': s.totalAttended,
      'Attendance Rate': `${s.percentage}%`,
      '75% Compliance': s.percentage >= 75 ? 'Safe' : 'Shortage',
      'Safe Buffer (Can Miss)': s.safeBunks,
      'Mandatory Classes Needed': s.classesNeeded
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
    XLSX.writeFile(workbook, 'Semester_Attendance_Data.xlsx');
  };

  return (
    <div className="content-container">
      {/* KPI Overview */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-title">Overall Percentage</div>
          <div
            className="kpi-val"
            style={{
              color: summary && summary.overallPercentage >= (user?.targetPercentage || 75) ? 'var(--safe-text)' : 'var(--danger-text)'
            }}
          >
            {summary ? `${summary.overallPercentage}%` : '0%'}
          </div>
          <div className="kpi-sub">Target: {user?.targetPercentage || 75}%</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Total Sessions</div>
          <div className="kpi-val">
            {summary ? `${summary.totalAttended} / ${summary.totalConducted}` : '0 / 0'}
          </div>
          <div className="kpi-sub">Attended of Conducted</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Subjects at Risk</div>
          <div
            className="kpi-val"
            style={{ color: summary && summary.atRiskCount > 0 ? 'var(--danger-text)' : 'var(--safe-text)' }}
          >
            {summary ? summary.atRiskCount : 0}
          </div>
          <div className="kpi-sub">Below {user?.targetPercentage || 75}% threshold</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-title">Buffer Margin</div>
          <div className="kpi-val" style={{ color: 'var(--accent)' }}>
            {summary ? (summary.overallSafeBunks > 0 ? `+${summary.overallSafeBunks}` : '0') : '0'}
          </div>
          <div className="kpi-sub">Overall safe absences</div>
        </div>
      </div>

      <div className="dashboard-split">
        {/* Left Column: Export Controls */}
        <div className="card-panel">
          <div className="card-panel-header">
            <h2 className="card-panel-title">Download Official Records</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Generate high-resolution reports for department submission, professor verification, or personal tracking.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button className="btn-primary" onClick={exportPDF} style={{ padding: '10px 18px' }}>
              📄 Download PDF Report
            </button>
            <button className="btn-secondary" onClick={exportExcel} style={{ padding: '10px 18px' }}>
              📊 Export Excel Sheet (.xlsx)
            </button>
          </div>
        </div>

        {/* Right Column: Automated Email Notification */}
        <div className="card-panel">
          <div className="card-panel-header">
            <h3 className="card-panel-title">Automated Email Automation</h3>
            <span className={`badge-pill ${user?.emailNotificationsEnabled !== false ? 'badge-safe' : 'badge-neutral'}`}>
              {user?.emailNotificationsEnabled !== false ? 'Active' : 'Disabled in Settings'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Delivered automatically{' '}
            <strong>
              {user?.notificationDay === 'Daily' ? 'Every Day' : `Every ${user?.notificationDay || 'Sunday'}`} at{' '}
              {formatTime12h(user?.notificationTime || '20:00')}
            </strong>.
          </p>

          <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: 'var(--text-main)', marginBottom: '5px' }}>
                Recipient Email Address:
              </label>
              <input
                type="email"
                value={targetRecipient}
                onChange={(e) => setTargetRecipient(e.target.value)}
                placeholder="e.g. bhangiakash10@gmail.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
              <strong>Scheduled Slot:</strong> {formatTime12h(user?.notificationTime || '20:00')} ({user?.notificationDay || 'Sunday'})
              <br />
              <strong>Contents:</strong> Week's attended vs. missed summary, 75% compliance status, and safe bunk margins.
            </div>
          </div>

          <button
            className="btn-secondary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '14px' }}
            onClick={handleTestEmail}
            disabled={sendingEmail || !targetRecipient.trim()}
          >
            {sendingEmail ? 'Dispatching Email...' : '✉️ Send Test Digest to Email Now'}
          </button>

          {dispatchedInfo && (
            <div style={{ background: 'var(--safe-bg)', border: '1px solid var(--safe-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '12px', color: 'var(--safe-text)', marginTop: '12px', lineHeight: '1.5' }}>
              ✓ <strong>Email Dispatched Successfully!</strong>
              <br />
              Sent to: <strong>{dispatchedInfo.to}</strong>
              <br />
              <span style={{ fontSize: '11px', opacity: 0.9 }}>
                💡 Tip: If not visible in Primary, check your <strong>Spam</strong> or <strong>Promotions / Updates</strong> folder.
              </span>
            </div>
          )}

          {emailPreviewUrl && (
            <div style={{ background: 'var(--safe-bg)', border: '1px solid var(--safe-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '12px', color: 'var(--safe-text)', marginTop: '12px', lineHeight: '1.4' }}>
              🎉 <strong>Email Generated!</strong>{' '}
              <a href={emailPreviewUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--safe-text)', fontWeight: 700, textDecoration: 'underline' }}>
                Open Delivered HTML Email Preview ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {/* AI Strategic Attendance Intelligence Panel */}
      <div className="card-panel" style={{ marginTop: '24px' }}>
        <div className="card-panel-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="card-panel-title">🤖 AI Attendance Analysis & Strategy</h2>
              <span className="badge-pill badge-neutral" style={{ fontSize: '10px' }}>
                Powered by {aiInsights?.modelUsed || 'Google Gemini AI'}
              </span>
              {aiInsights && (
                <span
                  className={`badge-pill ${
                    aiInsights.standing === 'Compliant' || aiInsights.standing === 'Safe'
                      ? 'badge-safe'
                      : 'badge-danger'
                  }`}
                >
                  {aiInsights.standing}
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time deep analysis: deficit recovery roadmaps, safe bunk forecasts & exam eligibility
            </span>
          </div>
          <button
            className="btn-primary"
            onClick={generateAIInsights}
            disabled={loadingAI}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loadingAI ? 'Analyzing...' : '✨ Refresh AI Analysis'}
          </button>
        </div>


        {loadingAI ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>
              Gemini AI is analyzing your semester courses...
            </strong>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              Calculating consecutive classes needed, safe bunk margins, and exam eligibility standing.
            </p>
          </div>
        ) : aiError ? (
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              textAlign: 'left'
            }}
          >
            {aiError.isRateLimit ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--warning-bg)',
                      border: '1px solid var(--warning-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      flexShrink: 0
                    }}
                  >
                    ⏳
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                      Daily Gemini API Free Quota Limit Reached
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Google Gemini Free Tier allows 20 requests/day per model for this project.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '10px',
                    margin: '16px 0'
                  }}
                >
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--warning-text)', marginBottom: '3px' }}>
                      Status: 429 Resource Exhausted
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                      Daily limit reached on gemini-3.8-flash. The system is ready to switch to active models (gemini-3.7-flash, gemini-3.5-flash-lite).
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--safe-text)', marginBottom: '3px' }}>
                      Zero Data Lost • Instant Strategy Available
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                      Your course metrics, safe bunks, and recovery deficits are fully pre-computed and viewable right now.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'center' }}>
                  <button
                    className="btn-primary"
                    onClick={generateOfflineInsights}
                    style={{ padding: '9px 18px', fontSize: '13px' }}
                  >
                    ⚡ View Instant Offline Strategy
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={generateAIInsights}
                    style={{ padding: '9px 16px', fontSize: '13px' }}
                  >
                    🔄 Retry with Backup Models
                  </button>
                </div>

                <details style={{ marginTop: '18px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}>
                    🔍 View Technical Diagnostic Details
                  </summary>
                  <pre
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      marginTop: '8px',
                      overflowX: 'auto',
                      maxHeight: '130px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {aiError.rawError || aiError.message}
                  </pre>
                </details>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--danger-bg)',
                      border: '1px solid var(--danger-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0
                    }}
                  >
                    ⚠️
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--danger-text)' }}>
                      AI Analytics Service Notice
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {aiError.message}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    className="btn-primary"
                    onClick={generateOfflineInsights}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    ⚡ View Instant Offline Strategy
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={generateAIInsights}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Retry AI Analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : aiInsights ? (
          <div>
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px',
                fontSize: '13px',
                lineHeight: '1.6'
              }}
            >
              {renderMarkdown(aiInsights.aiAnalysis)}
            </div>

            {aiInsights.generatedAt && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>
                Generated: {new Date(aiInsights.generatedAt).toLocaleTimeString()} • Engine: {aiInsights.modelUsed ? `Google ${aiInsights.modelUsed}` : 'Google Gemini AI'}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <button className="btn-primary" onClick={generateAIInsights}>
              ✨ Generate AI Strategic Guidance
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
