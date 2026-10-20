const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  semesterStartDate: {
    type: Date,
    default: null
  },
  semesterEndDate: {
    type: Date,
    default: null
  },
  targetPercentage: {
    type: Number,
    default: 75,
    min: 50,
    max: 95
  },
  emailNotificationsEnabled: {
    type: Boolean,
    default: true
  },
  notificationTime: {
    type: String,
    default: '20:00'
  },
  notificationDay: {
    type: String,
    default: 'Sunday',
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Daily']
  },
  lastNotificationSentDate: {
    type: String,
    default: ''
  },
  lastNotificationSentSlot: {
    type: String,
    default: ''
  },
  notificationEmail: {
    type: String,
    lowercase: true,
    trim: true,
    default: ''
  },
  smtpUser: {
    type: String,
    default: ''
  },
  smtpPass: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
