const express = require('express');
const cors = require('cors');
const path = require('path');
const upload = require('./middleware/upload');
const { protect } = require('./middleware/authMiddleware');

// Controllers
const authController = require('./controllers/authController');
const subjectController = require('./controllers/subjectController');
const timetableController = require('./controllers/timetableController');
const attendanceController = require('./controllers/attendanceController');
const analyticsController = require('./controllers/analyticsController');

const app = express();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// ================= AUTH ROUTES =================
app.post('/api/auth/google', authController.googleLogin);
app.post('/api/auth/dev-login', authController.devLogin);
app.get('/api/auth/me', protect, authController.getMe);
app.put('/api/auth/settings', protect, authController.updateSettings);

// ================= SUBJECTS ROUTES =================
app.get('/api/subjects', protect, subjectController.getSubjects);
app.post('/api/subjects', protect, subjectController.createSubject);
app.put('/api/subjects/:id', protect, subjectController.updateSubject);
app.delete('/api/subjects/:id', protect, subjectController.deleteSubject);

// ================= TIMETABLE ROUTES =================
app.get('/api/timetable', protect, timetableController.getTimetable);
app.post('/api/timetable/slot', protect, timetableController.addSlot);
app.delete('/api/timetable/slot/:id', protect, timetableController.deleteSlot);
app.delete('/api/timetable/all', protect, timetableController.clearAllSlots);
app.post('/api/timetable/bulk', protect, timetableController.bulkSaveTimetable);
app.post('/api/timetable/scan-ai', protect, upload.single('timetableFile'), timetableController.scanTimetableAI);

// ================= ATTENDANCE ROUTES =================
app.get('/api/attendance/today', protect, attendanceController.getTodayAttendance);
app.post('/api/attendance/mark', protect, attendanceController.markAttendance);
app.post('/api/attendance/note', protect, attendanceController.updateAttendanceNote);
app.post('/api/attendance/unmark', protect, attendanceController.unmarkAttendance);
app.delete('/api/attendance/mark', protect, attendanceController.unmarkAttendance);
app.get('/api/attendance/history', protect, attendanceController.getAttendanceHistory);
app.post('/api/attendance/reset', protect, attendanceController.resetAllAttendance);

// ================= ANALYTICS & EXPORT ROUTES =================
app.get('/api/analytics/summary', protect, analyticsController.getAnalyticsSummary);
app.post('/api/analytics/ai-insights', protect, analyticsController.getAIInsights);
app.post('/api/analytics/send-test-email', protect, analyticsController.triggerTestEmail);

// ================= PRODUCTION STATIC SERVING =================
// Serve the built React client in production
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// SPA catch-all: serve index.html for any non-API GET route (client-side routing)
app.use((req, res, next) => {
  // Skip non-GET requests, API routes, and health checks
  if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      // If dist doesn't exist (dev mode), fall through to 404
      next();
    }
  });
});

// 404 Handler (API routes that don't match)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Global Error Handler (Ensures all errors return JSON instead of HTML)
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

module.exports = app;
