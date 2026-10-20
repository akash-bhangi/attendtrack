const TimetableSlot = require('../models/TimetableSlot');
const Subject = require('../models/Subject');
const AttendanceLog = require('../models/AttendanceLog');
const { GoogleGenAI } = require('@google/genai');

// @desc    Get complete timetable grouped by day
// @route   GET /api/timetable
const getTimetable = async (req, res) => {
  try {
    const slots = await TimetableSlot.find({ userId: req.user._id })
      .populate('subjectId', 'name code type faculty totalConducted totalAttended')
      .sort({ startTime: 1 });

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = {};
    days.forEach((day) => {
      grouped[day] = [];
    });

    slots.forEach((slot) => {
      if (grouped[slot.dayOfWeek]) {
        grouped[slot.dayOfWeek].push({
          id: slot._id,
          _id: slot._id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          subject: slot.subjectId
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        raw: slots,
        byDay: grouped
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add single timetable slot
// @route   POST /api/timetable/slot
const addSlot = async (req, res) => {
  try {
    const { subjectId, dayOfWeek, startTime, endTime, room } = req.body;

    if (!subjectId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'All slot fields are required' });
    }

    const subject = await Subject.findOne({ _id: subjectId, userId: req.user._id });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const slot = await TimetableSlot.create({
      userId: req.user._id,
      subjectId,
      dayOfWeek,
      startTime,
      endTime,
      room: room || ''
    });

    const populated = await slot.populate('subjectId', 'name code type faculty');

    res.status(201).json({
      success: true,
      data: populated,
      message: 'Timetable slot created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete timetable slot
// @route   DELETE /api/timetable/slot/:id
const deleteSlot = async (req, res) => {
  try {
    const slot = await TimetableSlot.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Slot removed from timetable'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk save complete timetable (purges old timetable & obsolete data for optimal DB storage)
// @route   POST /api/timetable/bulk
const bulkSaveTimetable = async (req, res) => {
  try {
    const { slots, replaceExisting = true, resetAttendance = true, clearOldSubjects = true } = req.body;

    if (!Array.isArray(slots)) {
      return res.status(400).json({ success: false, message: 'slots must be an array' });
    }

    let deletedSlotsCount = 0;
    let deletedSubjectsCount = 0;
    let deletedLogsCount = 0;

    // 1. Purge all prior timetable slots for this user from database
    if (replaceExisting !== false) {
      const delSlotsRes = await TimetableSlot.deleteMany({ userId: req.user._id });
      deletedSlotsCount = delSlotsRes.deletedCount;
    }

    // 2. If resetAttendance is requested, purge all historical attendance logs
    if (resetAttendance) {
      const delLogsRes = await AttendanceLog.deleteMany({ userId: req.user._id });
      deletedLogsCount += delLogsRes.deletedCount;

      // Reset baseline counts for remaining courses
      await Subject.updateMany(
        { userId: req.user._id },
        { $set: { totalConducted: 0, totalAttended: 0 } }
      );
    }

    // 3. If clearOldSubjects is requested, cascade-delete subjects not present in the new timetable
    // and delete their associated attendance logs to prevent orphaned records in MongoDB
    if (clearOldSubjects) {
      const activeSubjectIds = [...new Set(slots.map((s) => s.subjectId.toString()))];
      
      const oldSubjects = await Subject.find({
        userId: req.user._id,
        _id: { $nin: activeSubjectIds }
      }).select('_id');
      const oldSubjectIds = oldSubjects.map((s) => s._id);

      if (oldSubjectIds.length > 0) {
        const delSubjectLogsRes = await AttendanceLog.deleteMany({
          userId: req.user._id,
          subjectId: { $in: oldSubjectIds }
        });
        deletedLogsCount += delSubjectLogsRes.deletedCount;

        const delSubsRes = await Subject.deleteMany({
          userId: req.user._id,
          _id: { $in: oldSubjectIds }
        });
        deletedSubjectsCount = delSubsRes.deletedCount;
      }
    }

    // 4. Insert only clean, new timetable slots
    const slotsToInsert = slots.map((s) => ({
      userId: req.user._id,
      subjectId: s.subjectId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room || ''
    }));

    const created = await TimetableSlot.insertMany(slotsToInsert);

    res.status(200).json({
      success: true,
      count: created.length,
      deletedSlotsCount,
      deletedSubjectsCount,
      deletedLogsCount,
      message: `Complete timetable saved successfully. Cleared ${deletedSlotsCount} old slots${deletedSubjectsCount > 0 ? `, ${deletedSubjectsCount} obsolete subjects` : ''}${deletedLogsCount > 0 ? `, and ${deletedLogsCount} old attendance records` : ''} from database to optimize data storage.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all timetable slots for current user
// @route   DELETE /api/timetable/all
const clearAllSlots = async (req, res) => {
  try {
    const result = await TimetableSlot.deleteMany({ userId: req.user._id });
    res.status(200).json({
      success: true,
      count: result.deletedCount,
      message: `Successfully deleted all ${result.deletedCount} timetable slots from database.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    AI Timetable Scanner (Gemini Multimodal OCR)
// @route   POST /api/timetable/scan-ai
const scanTimetableAI = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a timetable image or PDF' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      // Mock response for testing when API key is not yet configured
      return res.status(200).json({
        success: true,
        isMock: true,
        data: {
          detectedSubjects: [
            { name: 'Operating Systems', code: 'CS301', type: 'Theory', faculty: 'Prof. Sharma' },
            { name: 'Computer Networks', code: 'CS304', type: 'Theory', faculty: 'Dr. Verma' },
            { name: 'Database Management', code: 'CS305', type: 'Theory', faculty: 'Dr. Iyer' },
            { name: 'Networks Lab', code: 'CS308P', type: 'Lab', faculty: 'Lab Staff' }
          ],
          slots: [
            { dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', subjectName: 'Operating Systems', room: '402' },
            { dayOfWeek: 'Monday', startTime: '10:15', endTime: '11:15', subjectName: 'Computer Networks', room: '202' },
            { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:00', subjectName: 'Operating Systems', room: '402' },
            { dayOfWeek: 'Wednesday', startTime: '10:15', endTime: '11:15', subjectName: 'Database Management', room: '305' },
            { dayOfWeek: 'Wednesday', startTime: '13:30', endTime: '15:30', subjectName: 'Networks Lab', room: 'Lab 2' },
            { dayOfWeek: 'Friday', startTime: '09:00', endTime: '10:00', subjectName: 'Computer Networks', room: '202' },
            { dayOfWeek: 'Friday', startTime: '10:15', endTime: '11:15', subjectName: 'Database Management', room: '305' }
          ]
        },
        message: 'Timetable schedule parsed successfully (Mock mode: add GEMINI_API_KEY in .env for live AI extraction)'
      });
    }

    // Live Gemini Vision extraction
    const ai = new GoogleGenAI({ apiKey });
    const imageBase64 = req.file.buffer.toString('base64');

    const prompt = `You are an expert academic schedule parser. Analyze this college timetable image or document.
Extract all subjects and all weekly timetable slots.
Output strictly valid JSON with this exact schema:
{
  "detectedSubjects": [
    { "name": "Subject Name", "code": "CS101", "type": "Theory", "faculty": "Professor name if visible" }
  ],
  "slots": [
    {
      "dayOfWeek": "Monday",
      "startTime": "09:00",
      "endTime": "10:00",
      "subjectName": "Subject Name exactly matching one in detectedSubjects",
      "room": "Room number if visible"
    }
  ]
}
Note: "dayOfWeek" must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.
"startTime" and "endTime" must be 24hr format HH:MM.
Do not include markdown or backticks in the response. Return raw JSON string only.`;

    let responseText = '';
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: req.file.mimetype || 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`[AI Scan] Model ${modelName} error:`, err.message);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No response received from Gemini AI models');
    }

    let text = responseText.trim();
    // Clean code fences if present
    text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

    // Extract outermost JSON object if model included extra conversational text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }

    const parsedData = JSON.parse(text);

    res.status(200).json({
      success: true,
      isMock: false,
      data: parsedData,
      message: 'AI timetable extraction complete'
    });
  } catch (error) {
    console.error('[AI Timetable Scan Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to parse timetable image: ' + error.message });
  }
};

module.exports = {
  getTimetable,
  addSlot,
  deleteSlot,
  clearAllSlots,
  bulkSaveTimetable,
  scanTimetableAI
};
