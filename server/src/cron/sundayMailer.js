const cron = require('node-cron');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AttendanceLog = require('../models/AttendanceLog');
const { createTransporter } = require('../config/mailer');
const { calculateMetrics } = require('../controllers/subjectController');

// Normalize time string helper (e.g. "8:30" -> "08:30")
const normalizeTimeStr = (t) => {
  if (!t) return '20:00';
  const parts = t.trim().split(':');
  if (parts.length !== 2) return '20:00';
  const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
  const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
  return `${h}:${m}`;
};

// Compile and send email for a single user (supports optional customRecipient)
const sendWeeklySummaryEmail = async (userId, customRecipient = null) => {
  const user = await User.findById(userId);
  if (!user || !user.email) return null;

  const subjects = await Subject.find({ userId: user._id });
  const targetPercent = user.targetPercentage || 75;

  let totalConducted = 0;
  let totalAttended = 0;
  const subjectsData = [];
  const alertSubjects = [];

  subjects.forEach((sub) => {
    totalConducted += sub.totalConducted;
    totalAttended += sub.totalAttended;
    const metrics = calculateMetrics(sub.totalAttended, sub.totalConducted, targetPercent);
    subjectsData.push({ ...sub.toObject(), ...metrics });

    if (metrics.status === 'danger') {
      alertSubjects.push({ ...sub.toObject(), ...metrics });
    }
  });

  const overallPercent = totalConducted > 0 ? ((totalAttended / totalConducted) * 100).toFixed(1) : '100.0';
  const isCompliant = Number(overallPercent) >= targetPercent;

  // Build HTML Email Table Rows
  const tableRows = subjectsData
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">${s.name} ${s.code ? `(${s.code})` : ''}</td>
      <td style="padding: 10px 12px; text-align: center; color: #475569;">${s.totalAttended} / ${s.totalConducted}</td>
      <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: ${
        s.percentage >= 75 ? '#059669' : '#dc2626'
      };">${s.percentage}%</td>
      <td style="padding: 10px 12px; text-align: right; font-size: 12px;">
        ${
          s.percentage >= 75
            ? `<span style="color: #059669; background: #ecfdf5; padding: 3px 8px; border-radius: 4px; font-weight: 600;">Safe (+${s.safeBunks})</span>`
            : `<span style="color: #dc2626; background: #fef2f2; padding: 3px 8px; border-radius: 4px; font-weight: 700;">Need ${s.classesNeeded} more</span>`
        }
      </td>
    </tr>
  `
    )
    .join('');

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '8:00 PM';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const scheduledTimeDisplay = formatTime12h(user.notificationTime || '20:00');
  const scheduledDayDisplay = user.notificationDay === 'Daily' ? 'Daily Attendance Report' : `${user.notificationDay || 'Sunday'} Digest`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>AttendTrack Attendance Digest</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: #0f172a; padding: 20px 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 18px; font-weight: 700;">AttendTrack — ${scheduledDayDisplay}</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Academic Standing as of ${scheduledTimeDisplay}</p>
        </div>

        <div style="padding: 24px;">
          <p style="margin-top: 0; font-size: 14px; color: #334155;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Here is your compiled attendance report to help you stay compliant with your institution's <strong>${targetPercent}% minimum attendance criteria</strong>.</p>

          <!-- KPI Box -->
          <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; display: flex; justify-content: space-around; text-align: center;">
            <div style="display: inline-block; width: 45%; text-align: center;">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Cumulative Percentage</span>
              <div style="font-size: 26px; font-weight: 800; color: ${isCompliant ? '#059669' : '#dc2626'}; margin-top: 2px;">${overallPercent}%</div>
              <span style="font-size: 11px; color: ${isCompliant ? '#059669' : '#dc2626'}; font-weight: 600;">${isCompliant ? 'Compliant' : 'Shortage Detected'}</span>
            </div>
            <div style="display: inline-block; width: 45%; text-align: center;">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Total Attended</span>
              <div style="font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 2px;">${totalAttended} / ${totalConducted}</div>
              <span style="font-size: 11px; color: #64748b;">Classes Conducted</span>
            </div>
          </div>

          <!-- Danger Alert Banner if Any -->
          ${
            alertSubjects.length > 0
              ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
              <strong style="color: #991b1b; font-size: 13px;">⚠️ Attendance Shortage Alert:</strong>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #b91c1c;">You are currently below 75% in <strong>${alertSubjects
                .map((s) => s.name)
                .join(', ')}</strong>. Please review the mandatory classes needed below.</p>
            </div>
          `
              : `
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
              <strong style="color: #065f46; font-size: 13px;">✓ All Subjects Compliant:</strong>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #047857;">Great job! All your subjects are currently meeting or exceeding the 75% criteria.</p>
            </div>
          `
          }

          <!-- Course Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">
                <th style="padding: 10px 12px; text-align: left;">Course</th>
                <th style="padding: 10px 12px; text-align: center;">Attended</th>
                <th style="padding: 10px 12px; text-align: center;">%</th>
                <th style="padding: 10px 12px; text-align: right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600;">
              Open AttendTrack Dashboard
            </a>
          </div>

        </div>

        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; font-size: 11px; color: #94a3b8; text-align: center;">
          Sent automatically based on your custom notification schedule (${user.notificationDay || 'Sunday'} at ${user.notificationTime || '20:00'}). You can customize or disable this in Settings.
        </div>

      </div>
    </body>
    </html>
  `;

  // Determine recipient email: custom recipient -> user's notificationEmail -> fallback
  let recipient = customRecipient?.trim() || user.notificationEmail?.trim();
  if (!recipient) {
    if (user.email === 'student.demo@college.edu' && process.env.SMTP_USER) {
      recipient = process.env.SMTP_USER;
    } else {
      recipient = user.email;
    }
  }

  const now = new Date();
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const mailConfig = await createTransporter(user);
  const mailOptions = {
    from: mailConfig.fromAddress,
    to: recipient,
    subject: `Attendance Digest (${overallPercent}% Overall Compliance) — ${user.notificationDay || 'Report'} [${dateLabel}, ${timeLabel}]`,
    html: htmlContent
  };

  const info = await mailConfig.transporter.sendMail(mailOptions);
  let previewUrl = null;
  if (mailConfig.isEthereal) {
    previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Notification Scheduler] Ethereal live web preview: ${previewUrl}`);
  }
  console.log(`[Notification Scheduler] Sent digest to ${recipient} (Mode: ${mailConfig.mode}, MessageID: ${info.messageId})`);
  return {
    ...info,
    mode: mailConfig.mode,
    isReal: mailConfig.isReal || false,
    previewUrl,
    to: recipient,
    subject: mailOptions.subject
  };
};

// Start the custom cron scheduler (Runs every minute to evaluate each user's custom day & time)
const initNotificationScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = days[now.getDay()];
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentSlot = `${todayStr}_${currentTime}`;

      const activeUsers = await User.find({ emailNotificationsEnabled: true });

      for (const user of activeUsers) {
        const targetTime = normalizeTimeStr(user.notificationTime || '20:00');
        const targetDay = user.notificationDay || 'Sunday';

        const dayMatches = targetDay === 'Daily' || targetDay === currentDayName;
        const timeMatches = targetTime === currentTime;
        const notSentThisSlot = user.lastNotificationSentSlot !== currentSlot;

        if (dayMatches && timeMatches && notSentThisSlot) {
          try {
            console.log(`[Notification Scheduler] Match found for ${user.email} (${targetDay} at ${targetTime}). Dispatching notification...`);
            const sendResult = await sendWeeklySummaryEmail(user._id);
            user.lastNotificationSentSlot = currentSlot;
            user.lastNotificationSentDate = todayStr;
            await user.save();
            console.log(`[Notification Scheduler] Dispatched digest to ${user.email} (Mode: ${sendResult.mode})`);
          } catch (err) {
            console.error(`[Notification Scheduler] Failed dispatching email to ${user.email}:`, err.message);
          }
        }
      }
    } catch (error) {
      console.error('[Notification Scheduler Error]:', error);
    }
  });

  console.log('[Notification Scheduler] Custom time email notification scheduler active (Evaluates schedules every minute)');
};

module.exports = {
  initSundayScheduler: initNotificationScheduler,
  initNotificationScheduler,
  sendWeeklySummaryEmail,
  normalizeTimeStr
};
