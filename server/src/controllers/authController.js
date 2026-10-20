const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subject = require('../models/Subject');
const TimetableSlot = require('../models/TimetableSlot');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'attendtrack_super_secret_jwt_key_2026', {
    expiresIn: '30d'
  });
};

// Seed sample data for the demo user if empty
const seedDemoData = async (userId) => {
  const existingCount = await Subject.countDocuments({ userId });
  if (existingCount > 0) return;

  const subjectsToCreate = [
    { name: 'Operating Systems', code: 'CS-301', type: 'Theory', faculty: 'Prof. R. Sharma', totalConducted: 20, totalAttended: 17 },
    { name: 'Computer Networks', code: 'CS-304', type: 'Theory', faculty: 'Dr. R. Verma', totalConducted: 21, totalAttended: 15 },
    { name: 'Database Engineering', code: 'CS-305', type: 'Theory', faculty: 'Dr. K. Iyer', totalConducted: 24, totalAttended: 20 },
    { name: 'Computer Networks Lab', code: 'CS-308P', type: 'Lab', faculty: 'Systems Lab Staff', totalConducted: 9, totalAttended: 8 },
    { name: 'Design & Analysis of Algorithms', code: 'CS-302', type: 'Theory', faculty: 'Prof. S. Sen', totalConducted: 19, totalAttended: 16 }
  ];

  const createdSubjects = await Subject.insertMany(
    subjectsToCreate.map((s) => ({ ...s, userId }))
  );

  const subMap = {};
  createdSubjects.forEach((sub) => {
    subMap[sub.code] = sub._id;
  });

  const slotsToCreate = [
    // Monday
    { userId, subjectId: subMap['CS-301'], dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', room: 'Hall 4' },
    { userId, subjectId: subMap['CS-304'], dayOfWeek: 'Monday', startTime: '10:15', endTime: '11:15', room: 'Room 202' },
    { userId, subjectId: subMap['CS-308P'], dayOfWeek: 'Monday', startTime: '13:30', endTime: '15:30', room: 'Systems Lab 3' },
    // Tuesday
    { userId, subjectId: subMap['CS-305'], dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '10:00', room: 'Hall 2' },
    { userId, subjectId: subMap['CS-302'], dayOfWeek: 'Tuesday', startTime: '10:15', endTime: '11:15', room: 'Hall 4' },
    // Wednesday
    { userId, subjectId: subMap['CS-301'], dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:00', room: 'Hall 4' },
    { userId, subjectId: subMap['CS-305'], dayOfWeek: 'Wednesday', startTime: '10:15', endTime: '11:15', room: 'Hall 2' },
    { userId, subjectId: subMap['CS-308P'], dayOfWeek: 'Wednesday', startTime: '13:30', endTime: '15:30', room: 'Systems Lab 3' },
    // Thursday
    { userId, subjectId: subMap['CS-304'], dayOfWeek: 'Thursday', startTime: '09:00', endTime: '10:00', room: 'Room 202' },
    { userId, subjectId: subMap['CS-302'], dayOfWeek: 'Thursday', startTime: '10:15', endTime: '11:15', room: 'Hall 4' },
    // Friday
    { userId, subjectId: subMap['CS-301'], dayOfWeek: 'Friday', startTime: '09:00', endTime: '10:00', room: 'Hall 4' },
    { userId, subjectId: subMap['CS-305'], dayOfWeek: 'Friday', startTime: '10:15', endTime: '11:15', room: 'Hall 2' },
    // Saturday
    { userId, subjectId: subMap['CS-302'], dayOfWeek: 'Saturday', startTime: '09:00', endTime: '10:00', room: 'Hall 4' },
    { userId, subjectId: subMap['CS-304'], dayOfWeek: 'Saturday', startTime: '10:15', endTime: '11:15', room: 'Room 202' }
  ];

  await TimetableSlot.insertMany(slotsToCreate);
};

// @desc    Auth with Google ID Token
// @route   POST /api/auth/google
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is required' });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.warn('[Auth] Google verify error:', err.message);
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.avatar = picture || user.avatar;
        await user.save();
      } else {
        user = await User.create({
          googleId,
          email,
          name,
          avatar: picture,
          semesterStartDate: null,
          semesterEndDate: null,
          targetPercentage: 75,
          emailNotificationsEnabled: true,
          notificationEmail: email
        });
        // Clean account initialized without demo seed data
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          semesterStartDate: user.semesterStartDate,
          semesterEndDate: user.semesterEndDate,
          targetPercentage: user.targetPercentage,
          emailNotificationsEnabled: user.emailNotificationsEnabled,
          notificationTime: user.notificationTime || '20:00',
          notificationDay: user.notificationDay || 'Sunday',
          notificationEmail: user.notificationEmail || ''
        },
        token
      }
    });
  } catch (error) {
    console.error('[Google Login Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Demo/Dev Login (allows immediate testing without Google credentials setup)
// @route   POST /api/auth/dev-login
const devLogin = async (req, res) => {
  try {
    const demoEmail = 'student.demo@college.edu';
    let user = await User.findOne({ email: demoEmail });

    if (!user) {
      user = await User.create({
        googleId: 'dev_mock_google_id_123',
        email: demoEmail,
        name: 'Demo Student',
        avatar: '',
        semesterStartDate: new Date('2026-08-01'),
        semesterEndDate: new Date('2026-12-15'),
        targetPercentage: 75,
        emailNotificationsEnabled: true,
        notificationTime: '20:00',
        notificationDay: 'Sunday'
      });
    }

    // Seed sample subjects & schedule if empty
    await seedDemoData(user._id);

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          semesterStartDate: user.semesterStartDate,
          semesterEndDate: user.semesterEndDate,
          targetPercentage: user.targetPercentage,
          emailNotificationsEnabled: user.emailNotificationsEnabled,
          notificationTime: user.notificationTime || '20:00',
          notificationDay: user.notificationDay || 'Sunday',
          notificationEmail: user.notificationEmail || ''
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
};

// @desc    Update Settings & Semester Dates
// @route   PUT /api/auth/settings
const updateSettings = async (req, res) => {
  try {
    const {
      semesterStartDate,
      semesterEndDate,
      targetPercentage,
      emailNotificationsEnabled,
      notificationTime,
      notificationDay,
      notificationEmail,
      smtpUser,
      smtpPass
    } = req.body;
    const user = req.user;

    if (semesterStartDate !== undefined) user.semesterStartDate = semesterStartDate ? new Date(semesterStartDate) : null;
    if (semesterEndDate !== undefined) user.semesterEndDate = semesterEndDate ? new Date(semesterEndDate) : null;
    if (targetPercentage !== undefined) user.targetPercentage = Number(targetPercentage);
    if (emailNotificationsEnabled !== undefined) user.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);

    // Update custom recipient email if provided
    if (notificationEmail !== undefined) {
      user.notificationEmail = notificationEmail ? notificationEmail.trim().toLowerCase() : '';
    }

    // Validate and update custom notification time (HH:mm)
    if (notificationTime) {
      const parts = notificationTime.trim().split(':');
      if (parts.length === 2) {
        const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
        const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
        user.notificationTime = `${h}:${m}`;
        // Reset lastNotificationSentSlot so user can test the newly saved time slot immediately
        user.lastNotificationSentSlot = '';
      }
    }

    // Validate and update custom notification day
    if (notificationDay) {
      const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Daily'];
      if (validDays.includes(notificationDay.trim())) {
        user.notificationDay = notificationDay.trim();
        user.lastNotificationSentSlot = '';
      }
    }

    // Optional direct Gmail SMTP Credentials for real inbox delivery
    if (smtpUser !== undefined) user.smtpUser = smtpUser.trim();
    if (smtpPass !== undefined && smtpPass.trim() !== '') user.smtpPass = smtpPass.trim().replace(/\s+/g, '');

    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  googleLogin,
  devLogin,
  getMe,
  updateSettings
};
