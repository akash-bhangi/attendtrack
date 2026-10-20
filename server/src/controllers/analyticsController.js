const Subject = require('../models/Subject');
const AttendanceLog = require('../models/AttendanceLog');
const { calculateMetrics } = require('./subjectController');
const { sendWeeklySummaryEmail } = require('../cron/sundayMailer');
const { GoogleGenAI } = require('@google/genai');

// @desc    Get aggregate analytics summary
// @route   GET /api/analytics/summary
const getAnalyticsSummary = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user._id });
    const targetPercent = req.user.targetPercentage || 75;

    let totalConducted = 0;
    let totalAttended = 0;
    const subjectBreakdown = [];
    const atRiskSubjects = [];

    subjects.forEach((sub) => {
      totalConducted += sub.totalConducted;
      totalAttended += sub.totalAttended;

      const metrics = calculateMetrics(sub.totalAttended, sub.totalConducted, targetPercent);
      const subData = {
        id: sub._id,
        name: sub.name,
        code: sub.code,
        type: sub.type,
        faculty: sub.faculty,
        totalConducted: sub.totalConducted,
        totalAttended: sub.totalAttended,
        ...metrics
      };

      subjectBreakdown.push(subData);

      if (metrics.status === 'danger') {
        atRiskSubjects.push(subData);
      }
    });

    const overallPercentage =
      totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(1)) : 100.0;

    const target = targetPercent / 100;
    const overallClassesNeeded = Math.max(0, Math.ceil((target * totalConducted - totalAttended) / (1 - target)));
    const overallSafeBunks = Math.max(0, Math.floor((totalAttended - target * totalConducted) / target));

    res.status(200).json({
      success: true,
      data: {
        totalConducted,
        totalAttended,
        overallPercentage,
        overallClassesNeeded,
        overallSafeBunks,
        isCompliant: overallPercentage >= targetPercent,
        targetPercentage: targetPercent,
        subjectCount: subjects.length,
        atRiskCount: atRiskSubjects.length,
        atRiskSubjects,
        subjectBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate AI Attendance Strategy & Insights using Gemini
// @route   POST /api/analytics/ai-insights
const getAIInsights = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user._id });
    const targetPercent = req.user.targetPercentage || 75;

    let totalConducted = 0;
    let totalAttended = 0;

    const subjectBreakdown = subjects.map((sub) => {
      totalConducted += sub.totalConducted;
      totalAttended += sub.totalAttended;
      const metrics = calculateMetrics(sub.totalAttended, sub.totalConducted, targetPercent);
      return {
        name: sub.name,
        code: sub.code || '',
        type: sub.type,
        faculty: sub.faculty || '',
        conducted: sub.totalConducted,
        attended: sub.totalAttended,
        percentage: metrics.percentage,
        status: metrics.status,
        safeBunks: metrics.safeBunks,
        classesNeeded: metrics.classesNeeded
      };
    });

    const overallPct =
      totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(1)) : 100.0;

    if (subjects.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          standing: 'Setup Required',
          aiAnalysis: 'No subjects have been registered yet. Please upload your timetable or add your courses to enable AI analytics.'
        }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(200).json({
        success: true,
        data: {
          standing: overallPct >= targetPercent ? 'Safe' : 'Shortage',
          aiAnalysis: `Current overall attendance is **${overallPct}%** against the **${targetPercent}%** requirement. Add your GEMINI_API_KEY to activate dynamic AI strategic insights.`
        }
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert university academic advisor and attendance strategist for AttendTrack.
Analyze this student's actual semester attendance data:
- Target Requirement: ${targetPercent}%
- Overall Attendance: ${overallPct}% (${totalAttended} attended of ${totalConducted} conducted)
- Course Breakdown:
${JSON.stringify(subjectBreakdown, null, 2)}

Provide an authoritative, encouraging, and actionable strategy.
CRITICAL INSTRUCTION: Do NOT include raw mathematical equations or formula notations (such as y = floor(...) or x = ceil(...)) in your response. Present all calculations directly as practical numbers of classes.

Structure your response strictly using these 4 sections:

### 1. Overall Standing & Exam Eligibility
Brief evaluation of their overall standing and whether they are currently at risk of being debarred from semester exams. State the overall percentage (${overallPct}%) and institutional compliance status.

### 2. Urgent Recovery Plan (Courses Below ${targetPercent}%)
For every course below ${targetPercent}%, state the course name and code, current percentage, and state the exact number of consecutive classes required to attend without missing any. Explain why lab vs theory matters. If all courses are currently safe, provide a congratulatory clean sheet confirmation.

### 3. Safe Bunk Strategy & Cushion Classification
Classify ALL registered courses into clear buffer tiers based on safe bunks available:

#### 🟢 High Margin (2+ Safe Bunks Available)
List courses with 2 or more safe bunks available:
- **Course Name (Code)**: Current: X% | Buffer: +Y classes can be missed safely. Strategy: Practical advice on using this flexibility wisely.

#### 🟡 Moderate Margin (1 Safe Bunk Available)
List courses with exactly 1 safe bunk available:
- **Course Name (Code)**: Current: X% | Buffer: +1 class. Warning: Second absence immediately breaches target; reserve strictly for emergencies.

#### 🔴 Zero Margin / Danger Zone (0 Safe Bunks)
List courses with 0 safe bunks (attendance would drop below ${targetPercent}% on the very next absence):
- **Course Name (Code)**: Current: X% | Buffer: 0 classes. Critical Alert: Explain why attendance is vulnerable and that next session is mandatory.

(Note: If any course is in deficit, classify it under:
#### ⚠️ Deficit Zone (Recovery Required)
- **Course Name (Code)**: Current: X% | Deficit: Need Z consecutive classes to recover.)

### 4. Tactical Action Items for This Week
Provide exactly 3 clear, numbered action items the student should execute this week to maintain compliance.

MANDATORY FORMATTING: Every course listed under Section 3 MUST be a bullet item starting with '- **'. Use clean Markdown headers (###, ####). Do not wrap your response in code backticks.`;

    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash'
    ];
    let aiText = '';
    let usedModel = '';
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });
        if (response && response.text) {
          aiText = response.text.trim();
          usedModel = model;
          break;
        }
      } catch (err) {
        console.warn(`[AI Analytics] Model ${model} failed:`, err.message?.substring(0, 100));
        lastError = err;
      }
    }

    if (!aiText) {
      throw lastError || new Error('Failed to generate insights from Gemini');
    }

    res.status(200).json({
      success: true,
      data: {
        standing: overallPct >= targetPercent ? 'Compliant' : 'Shortage Alert',
        overallPercentage: overallPct,
        atRiskCount: subjectBreakdown.filter((s) => s.percentage < targetPercent).length,
        aiAnalysis: aiText,
        modelUsed: usedModel,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[AI Analytics Error]:', error);

    let isRateLimit = false;
    let cleanMessage = error.message || 'AI Analytics service encountered an error.';
    let retryAfter = null;

    try {
      const jsonStart = error.message?.indexOf('{');
      if (jsonStart !== -1 && jsonStart !== undefined) {
        const parsed = JSON.parse(error.message.substring(jsonStart));
        if (parsed.error) {
          if (parsed.error.code === 429 || parsed.error.status === 'RESOURCE_EXHAUSTED') {
            isRateLimit = true;
            cleanMessage = 'Google Gemini daily free tier quota (20 requests/day) has been reached for this project.';
            const retryInfo = parsed.error.details?.find((d) => d['@type']?.includes('RetryInfo'));
            if (retryInfo?.retryDelay) {
              retryAfter = retryInfo.retryDelay;
            }
          }
        }
      }
    } catch (e) {
      // Keep original message if parsing fails
    }

    res.status(isRateLimit ? 429 : 500).json({
      success: false,
      isRateLimit,
      retryAfter,
      message: cleanMessage,
      rawError: error.message
    });
  }
};

// @desc    Trigger test scheduled attendance digest email now
// @route   POST /api/analytics/send-test-email
const triggerTestEmail = async (req, res) => {
  try {
    const { recipientEmail } = req.body || {};
    const result = await sendWeeklySummaryEmail(req.user._id, recipientEmail);
    if (!result) {
      return res.status(400).json({ success: false, message: 'Could not generate email for user profile' });
    }
    const targetEmail = result.to || req.user.email;
    let msg = `Attendance digest dispatched for ${targetEmail}`;
    if (result && result.isReal) {
      msg = `Real attendance email dispatched directly to ${targetEmail} via Gmail! Check your inbox (or Spam/Promotions).`;
    } else if (result && result.previewUrl) {
      msg = `Test digest dispatched via Ethereal! Preview link: ${result.previewUrl}`;
    }
    res.status(200).json({
      success: true,
      data: result,
      message: msg
    });
  } catch (error) {
    console.error('[triggerTestEmail error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAnalyticsSummary,
  getAIInsights,
  triggerTestEmail
};
