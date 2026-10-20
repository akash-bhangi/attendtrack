const Subject = require('../models/Subject');
const TimetableSlot = require('../models/TimetableSlot');
const AttendanceLog = require('../models/AttendanceLog');

// Helper to compute 75% metrics
const calculateMetrics = (attended, conducted, targetPercent = 75) => {
  const A = Number(attended) || 0;
  const T = Number(conducted) || 0;
  const target = targetPercent / 100; // e.g. 0.75

  const percentage = T > 0 ? Number(((A / T) * 100).toFixed(1)) : 100.0;

  // Deficit: ceil((target * T - A) / (1 - target))
  // For target = 0.75: ceil((0.75*T - A) / 0.25) = ceil(3T - 4A)
  const classesNeeded = Math.max(0, Math.ceil((target * T - A) / (1 - target)));

  // Surplus: floor((A - target * T) / target)
  // For target = 0.75: floor((A - 0.75*T) / 0.75) = floor((4A - 3T) / 3)
  const safeBunks = Math.max(0, Math.floor((A - target * T) / target));

  let status = 'safe';
  if (percentage < targetPercent) {
    status = 'danger';
  } else if (percentage < targetPercent + 3) {
    status = 'warning';
  }

  return {
    percentage,
    classesNeeded,
    safeBunks,
    status
  };
};

// @desc    Get all subjects for current user
// @route   GET /api/subjects
const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user._id }).sort({ createdAt: 1 });
    const targetPercent = req.user.targetPercentage || 75;

    const subjectsWithMetrics = subjects.map((sub) => {
      const metrics = calculateMetrics(sub.totalAttended, sub.totalConducted, targetPercent);
      return {
        id: sub._id,
        _id: sub._id,
        name: sub.name,
        code: sub.code,
        type: sub.type,
        faculty: sub.faculty,
        totalConducted: sub.totalConducted,
        totalAttended: sub.totalAttended,
        ...metrics
      };
    });

    res.status(200).json({
      success: true,
      data: subjectsWithMetrics
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const ALLOWED_TYPES = ['Theory', 'Lab', 'Practical', 'Tutorial', 'Seminar', 'Project', 'Other'];

const sanitizeType = (input) => {
  if (!input) return 'Theory';
  const match = ALLOWED_TYPES.find((t) => t.toLowerCase() === String(input).trim().toLowerCase());
  if (match) return match;
  const str = String(input).trim().toLowerCase();
  if (str.includes('practic')) return 'Practical';
  if (str.includes('lab')) return 'Lab';
  if (str.includes('tutor')) return 'Tutorial';
  if (str.includes('theor') || str.includes('lectur')) return 'Theory';
  if (str.includes('seminar')) return 'Seminar';
  if (str.includes('project')) return 'Project';
  return 'Other';
};

// @desc    Create new subject
// @route   POST /api/subjects
const createSubject = async (req, res) => {
  try {
    const { name, code, type, faculty, totalConducted, totalAttended } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Subject name is required' });
    }

    const subject = await Subject.create({
      userId: req.user._id,
      name,
      code: code || '',
      type: sanitizeType(type),
      faculty: faculty || '',
      totalConducted: Number(totalConducted) || 0,
      totalAttended: Number(totalAttended) || 0
    });

    const metrics = calculateMetrics(subject.totalAttended, subject.totalConducted, req.user.targetPercentage || 75);

    res.status(201).json({
      success: true,
      data: {
        id: subject._id,
        _id: subject._id,
        name: subject.name,
        code: subject.code,
        type: subject.type,
        faculty: subject.faculty,
        totalConducted: subject.totalConducted,
        totalAttended: subject.totalAttended,
        ...metrics
      },
      message: 'Subject added successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a subject
// @route   PUT /api/subjects/:id
const updateSubject = async (req, res) => {
  try {
    const { name, code, type, faculty, totalConducted, totalAttended } = req.body;

    const subject = await Subject.findOne({ _id: req.params.id, userId: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    if (name !== undefined) subject.name = name;
    if (code !== undefined) subject.code = code;
    if (type !== undefined) subject.type = sanitizeType(type);
    if (faculty !== undefined) subject.faculty = faculty;
    if (totalConducted !== undefined) subject.totalConducted = Number(totalConducted);
    if (totalAttended !== undefined) subject.totalAttended = Number(totalAttended);

    await subject.save();

    const metrics = calculateMetrics(subject.totalAttended, subject.totalConducted, req.user.targetPercentage || 75);

    res.status(200).json({
      success: true,
      data: {
        id: subject._id,
        _id: subject._id,
        name: subject.name,
        code: subject.code,
        type: subject.type,
        faculty: subject.faculty,
        totalConducted: subject.totalConducted,
        totalAttended: subject.totalAttended,
        ...metrics
      },
      message: 'Subject updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete subject & cascading slots
// @route   DELETE /api/subjects/:id
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    // Cascade delete associated timetable slots and logs
    await TimetableSlot.deleteMany({ subjectId: req.params.id, userId: req.user._id });
    await AttendanceLog.deleteMany({ subjectId: req.params.id, userId: req.user._id });

    res.status(200).json({
      success: true,
      message: 'Subject and associated schedule slots deleted'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Batch update baseline attendance for mid-semester joiners
// @route   POST /api/subjects/batch-baseline
const batchUpdateBaselines = async (req, res) => {
  try {
    const { baselines } = req.body; // array of { subjectId, totalConducted, totalAttended }
    if (!Array.isArray(baselines)) {
      return res.status(400).json({ success: false, message: 'baselines must be an array' });
    }

    const updates = baselines.map(async (item) => {
      if (!item.subjectId) return null;
      return Subject.findOneAndUpdate(
        { _id: item.subjectId, userId: req.user._id },
        {
          $set: {
            totalConducted: Math.max(0, Number(item.totalConducted) || 0),
            totalAttended: Math.max(0, Number(item.totalAttended) || 0)
          }
        },
        { new: true }
      );
    });

    await Promise.all(updates);

    res.status(200).json({
      success: true,
      message: 'Mid-semester baseline attendance updated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  batchUpdateBaselines,
  calculateMetrics
};
