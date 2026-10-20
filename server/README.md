# AttendTrack Backend Server

Express.js REST API and automated scheduler service for AttendTrack.

---

## Features
- **Google OAuth Token Authentication**: Verifies Google ID tokens via `google-auth-library` and issues JWT sessions.
- **Subject & Attendance Engine**: Full CRUD for subjects with strict 75% predictive deficit/surplus math.
- **Multimodal Timetable AI Ingestion**: Processes timetable photos with `@google/genai` (Gemini 2.5 Flash / 1.5 Flash).
- **Weekly Sunday Digest**: Automatically calculates weekly attendance and dispatches email reports via `node-cron` & `nodemailer`.

---

## Setup & Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Configure Environment:**
   Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```
3. **Run Dev Server:**
   ```bash
   npm start
   ```

For detailed setup instructions on obtaining API credentials, see [ENVIRONMENT.md](file:///c:/Users/bhang/OneDrive/Desktop/Documents/Attendence%20Marker/ENVIRONMENT.md).
