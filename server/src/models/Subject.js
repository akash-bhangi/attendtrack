const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['Theory', 'Lab', 'Practical', 'Tutorial', 'Seminar', 'Project', 'Other'],
    default: 'Theory'
  },
  faculty: {
    type: String,
    trim: true,
    default: ''
  },
  totalConducted: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAttended: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Subject', subjectSchema);
