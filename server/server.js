const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initNotificationScheduler } = require('./src/cron/sundayMailer');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize custom-time email notification scheduler
initNotificationScheduler();

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`[AttendTrack Server] Running on port: ${PORT}`);
  console.log(`[Healthcheck] http://localhost:${PORT}/health`);
  console.log(`===============================================`);
});

module.exports = server;
