const nodemailer = require('nodemailer');

/**
 * Creates and configures a Nodemailer transporter.
 * Priority:
 * 1. User custom SMTP credentials (from database settings)
 * 2. Environment SMTP credentials (.env)
 * 3. Ethereal Email (Real disposable SMTP testing with live preview URL)
 * 4. Safe Console Mock
 */
const createTransporter = async (userOverrides = null) => {
  const rawUser = userOverrides?.smtpUser || process.env.SMTP_USER;
  const rawPass = userOverrides?.smtpPass || process.env.SMTP_PASS;
  const user = rawUser ? rawUser.trim() : '';
  const pass = rawPass ? rawPass.trim().replace(/\s+/g, '') : '';
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  // 1. If valid real credentials exist
  if (user && pass && !user.includes('your_email') && pass !== 'your_gmail_app_password') {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      }),
      fromAddress: `"AttendTrack Portal" <${user}>`,
      mode: 'real_smtp',
      isReal: true,
      senderEmail: user
    };
  }

  // 2. Real Ethereal SMTP test account fallback
  try {
    const testAccount = await nodemailer.createTestAccount();
    const etherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    return {
      transporter: etherealTransporter,
      fromAddress: `"AttendTrack Portal" <${testAccount.user}>`,
      mode: 'ethereal_test',
      isEthereal: true,
      senderEmail: testAccount.user
    };
  } catch (err) {
    console.warn('[Mailer] Ethereal fallback unavailable, using mock console:', err.message);
    return {
      transporter: {
        sendMail: async (options) => {
          console.log(`[Mailer Mock] To: ${options.to} | Subject: ${options.subject}`);
          return { messageId: 'mock-mail-id-' + Date.now(), isMock: true };
        }
      },
      fromAddress: 'no-reply@attendtrack.edu',
      mode: 'console_mock',
      isMock: true,
      senderEmail: 'no-reply@attendtrack.edu'
    };
  }
};

module.exports = { createTransporter };
