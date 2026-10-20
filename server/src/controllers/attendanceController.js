const AttendanceLog = require('../models/AttendanceLog');
const TimetableSlot = require('../models/TimetableSlot');
const Subject = require('../models/Subject');
const { calculateMetrics } = require('./subjectController');

// Helper to get normalized UTC date (YYYY-MM-DD at 00:00:00)
const normalizeDate = (dateInput) => {
  if (!dateInput) {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
  }
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [year, month, day] = dateInput.trim().split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

// @desc    Get today's scheduled classes and their marked status
// @route   GET /api/attendance/today?date=YYYY-MM-DD
const getTodayAttendance = async (req, res) => {
  try {
    let targetDate;
    if (typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date.trim())) {
      const [year, month, day] = req.query.date.trim().split('-').map(Number);
      targetDate = new Date(year, month - 1, day);
    } else {
      targetDate = req.query.date ? new Date(req.query.date) : new Date();
    }
    const normalizedTargetDate = normalizeDate(req.query.date || targetDate);

    // Get Day Name (e.g. "Wednesday")
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[targetDate.getDay()];

    if (currentDayName === 'Sunday') {
      return res.status(200).json({
        success: true,
        data: {
          dayName: currentDayName,
          date: normalizedTargetDate,
          isSunday: true,
          slots: []
        },
        message: 'Sunday: No regular classes scheduled.'
      });
    }

    // 1. Fetch all slots for this day of the week
    const slots = await TimetableSlot.find({
      userId: req.user._id,
      dayOfWeek: currentDayName
    })
      .populate('subjectId', 'name code type faculty totalConducted totalAttended')
      .sort({ startTime: 1 });

    // 2. Fetch all logs marked for this specific date
    const logs = await AttendanceLog.find({
      userId: req.user._id,
      date: normalizedTargetDate
    });

    const logMap = {};
    logs.forEach((log) => {
      logMap[log.subjectId.toString()] = log;
    });

    // 3. Merge slots with marked status
    const scheduledWithStatus = slots.map((slot) => {
      const subject = slot.subjectId;
      const log = subject ? logMap[subject._id.toString()] : null;

      const metrics = subject
        ? calculateMetrics(subject.totalAttended, subject.totalConducted, req.user.targetPercentage || 75)
        : null;

      return {
        slotId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        subject: subject
          ? {
              id: subject._id,
              _id: subject._id,
              name: subject.name,
              code: subject.code,
              type: subject.type,
              faculty: subject.faculty,
              totalConducted: subject.totalConducted,
              totalAttended: subject.totalAttended,
              ...metrics
            }
          : null,
        markedStatus: log ? log.status : 'Unmarked', // 'Present', 'Absent', 'Cancelled', 'Unmarked'
        logId: log ? log._id : null,
        notes: log ? (log.notes || '') : ''
      };
    });

    res.status(200).json({
      success: true,
      data: {
        dayName: currentDayName,
        date: normalizedTargetDate,
        isSunday: false,
        slots: scheduledWithStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark attendance for a subject on a date
// @route   POST /api/attendance/mark
const markAttendance = async (req, res) => {
  try {
    const { subjectId, status, date, notes } = req.body;

    if (!subjectId || !status) {
      return res.status(400).json({ success: false, message: 'subjectId and status are required' });
    }

    if (!['Present', 'Absent', 'Cancelled', 'Unmarked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be Present, Absent, Cancelled, or Unmarked' });
    }

    const normalizedDate = normalizeDate(date);

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Check if a log already exists for this date
    let existingLog = await AttendanceLog.findOne({
      userId: req.user._id,
      subjectId,
      date: normalizedDate
    });

    const oldStatus = existingLog ? existingLog.status : 'Unmarked';

    // Toggle off / Unmark if user clicks the currently selected status or sends 'Unmarked'
    if (status === 'Unmarked' || (existingLog && existingLog.status === status)) {
      if (existingLog) {
        if (oldStatus === 'Present') {
          subject.totalAttended = Math.max(0, subject.totalAttended - 1);
          subject.totalConducted = Math.max(0, subject.totalConducted - 1);
        } else if (oldStatus === 'Absent') {
          subject.totalConducted = Math.max(0, subject.totalConducted - 1);
        }
        await AttendanceLog.deleteMany({ userId: req.user._id, subjectId, date: normalizedDate });
        await subject.save();
      }

      const metrics = calculateMetrics(subject.totalAttended, subject.totalConducted, req.user.targetPercentage || 75);

      return res.status(200).json({
        success: true,
        data: {
          log: null,
          markedStatus: 'Unmarked',
          subject: {
            id: subject._id,
            _id: subject._id,
            name: subject.name,
            code: subject.code,
            type: subject.type,
            faculty: subject.faculty,
            totalConducted: subject.totalConducted,
            totalAttended: subject.totalAttended,
            ...metrics
          }
        },
        message: `Attendance cleared for ${subject.name}`
      });
    }

    if (existingLog) {
      // Revert previous impact on subject totals
      if (oldStatus === 'Present') {
        subject.totalAttended = Math.max(0, subject.totalAttended - 1);
        subject.totalConducted = Math.max(0, subject.totalConducted - 1);
      } else if (oldStatus === 'Absent') {
        subject.totalConducted = Math.max(0, subject.totalConducted - 1);
      }

      existingLog.status = status;
      if (notes !== undefined) existingLog.notes = notes;
      await existingLog.save();
    } else {
      existingLog = await AttendanceLog.create({
        userId: req.user._id,
        subjectId,
        date: normalizedDate,
        status,
        notes: notes || ''
      });
    }

    // Apply new status impact
    if (status === 'Present') {
      subject.totalAttended += 1;
      subject.totalConducted += 1;
    } else if (status === 'Absent') {
      subject.totalConducted += 1;
    }
    // Cancelled does not increment either

    await subject.save();

    const metrics = calculateMetrics(subject.totalAttended, subject.totalConducted, req.user.targetPercentage || 75);

    res.status(200).json({
      success: true,
      data: {
        log: existingLog,
        markedStatus: status,
        notes: existingLog ? (existingLog.notes || '') : '',
        subject: {
          id: subject._id,
          _id: subject._id,
          name: subject.name,
          code: subject.code,
          type: subject.type,
          faculty: subject.faculty,
          totalConducted: subject.totalConducted,
          totalAttended: subject.totalAttended,
          ...metrics
        }
      },
      message: `Marked ${status} for ${subject.name}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unmark/remove attendance document for a subject on a date
// @route   POST /api/attendance/unmark or DELETE /api/attendance/mark
const unmarkAttendance = async (req, res) => {
  try {
    const subjectId = req.body?.subjectId || req.query?.subjectId;
    const date = req.body?.date || req.query?.date;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }

    const normalizedDate = normalizeDate(date);
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const existingLogs = await AttendanceLog.find({
      userId: req.user._id,
      subjectId,
      date: normalizedDate
    });

    for (const log of existingLogs) {
      if (log.status === 'Present') {
        subject.totalAttended = Math.max(0, subject.totalAttended - 1);
        subject.totalConducted = Math.max(0, subject.totalConducted - 1);
      } else if (log.status === 'Absent') {
        subject.totalConducted = Math.max(0, subject.totalConducted - 1);
      }
    }

    await AttendanceLog.deleteMany({
      userId: req.user._id,
      subjectId,
      date: normalizedDate
    });

    await subject.save();

    const metrics = calculateMetrics(subject.totalAttended, subject.totalConducted, req.user.targetPercentage || 75);

    res.status(200).json({
      success: true,
      data: {
        log: null,
        markedStatus: 'Unmarked',
        subject: {
          id: subject._id,
          _id: subject._id,
          name: subject.name,
          code: subject.code,
          type: subject.type,
          faculty: subject.faculty,
          totalConducted: subject.totalConducted,
          totalAttended: subject.totalAttended,
          ...metrics
        }
      },
      message: `Attendance document removed for ${subject.name}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history
const getAttendanceHistory = async (req, res) => {
  try {
    const { startDate, endDate, subjectId, status } = req.query;
    const filter = { userId: req.user._id };

    if (startDate && endDate) {
      filter.date = {
        $gte: normalizeDate(startDate),
        $lte: normalizeDate(endDate)
      };
    } else if (startDate) {
      filter.date = { $gte: normalizeDate(startDate) };
    } else if (endDate) {
      filter.date = { $lte: normalizeDate(endDate) };
    }

    if (subjectId && subjectId !== 'all') {
      filter.subjectId = subjectId;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const logs = await AttendanceLog.find(filter)
      .populate('subjectId', 'name code type faculty')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset all attendance records and subject totals to 0
// @route   POST /api/attendance/reset
const resetAllAttendance = async (req, res) => {
  try {
    // 1. Delete all attendance logs for user
    await AttendanceLog.deleteMany({ userId: req.user._id });

    // 2. Reset all subject totalConducted and totalAttended to 0
    await Subject.updateMany(
      { userId: req.user._id },
      { $set: { totalConducted: 0, totalAttended: 0 } }
    );

    res.status(200).json({
      success: true,
      message: 'All attendance records and subject counts have been reset to 0 (Fresh Start)'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update note for an attendance log
// @route   POST /api/attendance/note
const updateAttendanceNote = async (req, res) => {
  try {
    const { subjectId, date, notes, status } = req.body;
    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }
    const normalizedDate = normalizeDate(date);
    let log = await AttendanceLog.findOne({
      userId: req.user._id,
      subjectId,
      date: normalizedDate
    });

    const noteText = typeof notes === 'string' ? notes.trim() : '';

    if (log) {
      log.notes = noteText;
      await log.save();
    } else {
      // If no log exists yet, create one
      const assignedStatus = status && ['Present', 'Absent', 'Cancelled'].includes(status) ? status : 'Present';
      const subject = await Subject.findOne({ _id: subjectId, userId: req.user._id });
      if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

      log = await AttendanceLog.create({
        userId: req.user._id,
        subjectId,
        date: normalizedDate,
        status: assignedStatus,
        notes: noteText
      });

      if (assignedStatus === 'Present') {
        subject.totalAttended += 1;
        subject.totalConducted += 1;
      } else if (assignedStatus === 'Absent') {
        subject.totalConducted += 1;
      }
      await subject.save();
    }

    res.status(200).json({
      success: true,
      data: {
        logId: log._id,
        notes: log.notes,
        markedStatus: log.status
      },
      message: 'Note saved successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTodayAttendance,
  markAttendance,
  unmarkAttendance,
  updateAttendanceNote,
  getAttendanceHistory,
  resetAllAttendance
};
