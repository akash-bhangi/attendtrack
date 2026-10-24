# 🎓 AttendTrack — Academic Attendance Management & 75% Compliance Engine

[![Live Web App](https://img.shields.io/badge/Live_App-attendtrack--steel.vercel.app-2563eb?style=for-the-badge&logo=vercel&logoColor=white)](https://attendtrack-steel.vercel.app)
[![API Server](https://img.shields.io/badge/Backend_API-Render_Cloud-000000?style=for-the-badge&logo=render&logoColor=white)](https://attendtrack-api.onrender.com)
[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas-47a248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

> 🚀 **Live Production Application:** [https://attendtrack-steel.vercel.app](https://attendtrack-steel.vercel.app)  
> ⚡ **Live Backend API (Healthcheck):** [https://attendtrack-api.onrender.com/health](https://attendtrack-api.onrender.com/health)  
> 📱 **PWA:** Installable directly on iOS, Android, and Desktop without an App Store.

[![React](https://img.shields.io/badge/Frontend-React%2019-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%208-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20Express%205-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47a248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20Vision-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![PWA](https://img.shields.io/badge/PWA-Installable%20Web%20App-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Styling](https://img.shields.io/badge/CSS-Modular%20Vanilla%20CSS-1572B6?logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)

**AttendTrack** is a production-grade, full-stack academic attendance management application engineered for college and university students. It completely eliminates attendance anxiety by automating daily logging, parsing physical timetables using **Google Gemini Vision AI**, calculating real-time **safe bunk buffers** against institutional 75% criteria, dispatching automated email notifications, tracking session notes (medical, on-duty, exams), and functioning as an installable **Progressive Web App (PWA)** on both desktop and mobile devices.

---

## 📑 Table of Contents

- [Live Production Deployment](#-live-production-deployment)
- [Overview & The Problem](#-overview--the-problem)
- [Key Features](#-key-features)
- [Mathematical Logic Engine (75% Criteria)](#-mathematical-logic-engine-75-criteria)
- [Technology Stack](#-technology-stack)
- [System Architecture & Folder Structure](#-system-architecture--folder-structure)
  - [Folder-by-Folder Specification](#folder-by-folder-specification)
- [Progressive Web App (PWA) & Mobile Installation](#-progressive-web-app-pwa--mobile-installation)
- [Getting Started](#-getting-started)
  - [1. Prerequisites](#1-prerequisites)
  - [2. Installation & Setup](#2-installation--setup)
  - [3. Environment Configuration](#3-environment-configuration)
  - [4. Running Locally](#4-running-locally)
- [API Reference](#-api-reference)
- [Automation & AI Integrations](#-automation--ai-integrations)
- [Contributing & License](#-contributing--license)

---

## 🌐 Live Production Deployment

AttendTrack is deployed on modern, high-availability cloud infrastructure with 100% free-tier architecture:

| Component | Platform | Production URL | Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://attendtrack-steel.vercel.app](https://attendtrack-steel.vercel.app) | Global Edge CDN, automated HTTPS, PWA enabled |
| **Backend API** | **Render** | [https://attendtrack-api.onrender.com](https://attendtrack-api.onrender.com) | Node.js Express 5 service, CORS-protected |
| **Cloud Database** | **MongoDB Atlas** | Cloud M0 Cluster | Automated multi-region backup & SRV resolution |
| **AI Vision OCR** | **Google Gemini** | Google AI Studio | Gemini 1.5 / 2.0 Flash for zero-shot timetable extraction |

---

## 💡 Overview & The Problem

Most higher education institutions enforce a mandatory minimum attendance threshold (typically **75%**) to qualify for semester examinations. Students frequently experience:
* **Debarment Surprises:** Finding out too late that attendance fell below the eligibility cutoff.
* **Calculation Errors:** Inability to accurately determine how many classes can safely be skipped for medical emergencies, sports, internships, or college fests.
* **Tedious Manual Logging:** Tracking individual period hours, cancelled classes, and varying weekly lab schedules across spreadsheets or paper.
* **Loss of Historical Context:** Forgetting *why* an absence occurred weeks or months later.

**AttendTrack** solves this through a unified daily dashboard, OCR-driven timetable ingestion, live recovery trajectories, contextual session reasons, and automated email digests.

---

## 🚀 Key Features

### 📅 1. Smart Timetable Matrix & Gemini Vision AI Ingestion
* **Visual Matrix View:** Period-by-period schedule spanning Monday through Saturday.
* **Automated OCR Scanning:** Upload an image or PDF of your university timetable — **Google Gemini Vision AI** automatically parses the grid, extracts course codes, subjects, faculty, rooms, and time slots.
* **Automatic Database Cleanup:** Uploading a new timetable automatically clears obsolete timetable slots and legacy orphaned data to prevent database bloat.
* **Manual Slot Configurator:** Add, edit, or remove period slots with custom start and end times.

### ⏱️ 2. One-Tap Daily Attendance Logging
* **Dynamic Day Sync:** Shows strictly the classes scheduled for the selected day.
* **Tri-State Action Buttons:**
  * `✓ Present` — Increments both attended and conducted counts (+1 / +1).
  * `✕ Absent` — Increments conducted count while attended remains static (0 / +1).
  * `⊘ Cancelled` — Class suspended by faculty with zero penalty (0 / 0).
* **Weekly Date-Strip Navigator:** Fast horizontal day picker with "TODAY" highlight to review or log past days.
* **Mid-Semester Calibration:** Joined midway? Manually calibrate baseline attended and conducted numbers without backdating dozens of historical logs.

### 📝 3. Attendance Session Notes & Reasons
* **Contextual Tagging:** Attach specific reasons or reminders to any class slot (e.g., *"Fever / Medical leave"*, *"On Duty (OD) for Sports Fest"*, *"Quiz on Unit 2"*).
* **One-Tap Quick Presets:** Includes instant chips for `🤒 Medical / Sick`, `🏆 On Duty (OD)`, `🚫 Prof Cancelled`, `📝 Quiz / Exam`, and `🚗 Family / Travel`.
* **Integrated History Ledger:** View and edit past session notes directly within the interactive semester history table, calendar inspector, and mobile timeline cards.

### 🧮 4. Predictive 75% Compliance Math Engine
* Live calculation of **Safe Bunks** (classes that can be missed safely) and **Consecutive Recovery Classes Needed**.
* Visual status tiering:
  * 🟢 **Safe / Compliant:** $\ge 75\%$
  * 🔴 **Deficit / Shortage Zone:** $< 75\%$
* Mini progress tracks with adaptive color fills.

### 📱 5. Progressive Web App (PWA) & Mobile Installation
* **Installable Native Feel:** Can be installed directly from the browser onto Android and iOS home screens.
* **Standalone Full-Screen Mode:** Runs without browser navigation bars or URL inputs.
* **Service Worker Caching (`sw.js`):** Pre-caches core app shell assets for fast loading and offline resiliency.
* **One-Tap In-App Install Prompt:** Interactive `📲 Install` button in the mobile header and sidebar with native prompts on Android and visual step-by-step guidance on iOS Safari.

### 📧 6. Flexible Automated Email Scheduler
* **Dynamic Delivery Schedule:** Configure automated email reports delivered **Daily**, **Weekly (Sunday, Monday, etc.)**, or disabled entirely.
* **Custom Time Picker:** Choose the exact minute of dispatch (e.g., `20:00`).
* **On-Demand Dispatch:** Instant *"Send Email Notification Now"* button for immediate testing.

### 📊 7. Official Export Suite
* **Print-Ready PDF Dossier:** Formatted document with institutional KPI summaries and per-course breakdowns.
* **Excel Workbook (.xlsx):** Detailed tabular spreadsheet ready for archiving.

### 🎨 8. Modular Vanilla CSS Architecture
* **Strictly Zero Tailwind / CSS Bloat:** Handcrafted pure CSS3 adhering to modern design tokens.
* **Component-Level Colocation:** Each page and component imports its own dedicated `.css` file, preventing cross-page regressions.
* **Adaptive Themes:** One-click light and dark mode toggle.

---

## 📐 Mathematical Logic Engine (75% Criteria)

Let:
* **$A$** = Number of classes attended so far
* **$T$** = Total number of classes conducted so far
* **$P$** = Target attendance threshold ($0.75$ for 75%)

### 1. Safe Bunks Formula (When Attendance $\ge 75\%$)
How many upcoming classes can you miss in a row without your attendance dropping below 75%?

$$\text{Safe Bunks} = \max\left(0, \left\lfloor \frac{4A - 3T}{3} \right\rfloor\right)$$

> **Example:** You attended $18$ out of $20$ classes ($90\%$).  
> $\text{Safe Bunks} = \lfloor (4 \times 18 - 3 \times 20) / 3 \rfloor = \lfloor (72 - 60) / 3 \rfloor = \mathbf{4\text{ classes}}$.  
> *(If you miss the next 4 classes, your attendance becomes $18/24 = 75\%$).*

---

### 2. Deficit Recovery Formula (When Attendance $< 75\%$)
How many consecutive future classes must you attend without missing any to restore your attendance to 75%?

$$\text{Classes Needed} = \max\left(0, \lceil 3T - 4A \rceil\right)$$

> **Example:** You attended $10$ out of $16$ classes ($62.5\%$).  
> $\text{Classes Needed} = \lceil 3(16) - 4(10) \rceil = \lceil 48 - 40 \rceil = \mathbf{8\text{ consecutive classes}}$.  
> *(Attending the next 8 classes brings attendance to $18/24 = 75\%$).*

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + Vite 8 | Ultra-fast client-side rendering, HMR, and build pipeline |
| **Styling Architecture** | Modular Vanilla CSS | Component-isolated CSS with unified design tokens |
| **Mobile PWA** | Web Manifest + Service Worker | Standalone mobile installation, custom icons, and offline caching |
| **Backend Framework** | Node.js + Express 5 | Scalable RESTful API with structured routing and error handling |
| **Database** | MongoDB + Mongoose 9 | Document store for users, subjects, timetables, and logs |
| **Multimodal AI** | Google Gemini (`@google/genai`) | Automated timetable OCR and schedule structuring |
| **Authentication** | Google OAuth 2.0 + JWT | Secure identity verification + One-Click Demo Mode |
| **Automation & Mail** | `node-cron` + `nodemailer` | Scheduled background email digest automation |
| **Document Export** | `jspdf`, `jspdf-autotable`, `xlsx` | In-browser client-side PDF and Excel generation |

---

## 📁 System Architecture & Folder Structure

```text
AttendTrack/
├── client/                               # Frontend Client Application
│   ├── public/                           # Static assets served directly at root
│   │   ├── favicon/                      # App icons, favicons, and web manifest
│   │   │   ├── apple-touch-icon.png      # iOS home screen icon (180x180)
│   │   │   ├── icon-192.png              # Android launcher icon (192x192)
│   │   │   ├── icon-512.png              # High-res PWA icon (512x512)
│   │   │   ├── favicon.svg               # Vector brand favicon
│   │   │   └── site.webmanifest          # PWA configuration manifest
│   │   ├── manifest.json                 # Standard PWA web manifest
│   │   └── sw.js                         # Service Worker (offline shell caching)
│   │
│   ├── src/
│   │   ├── api/                          # Centralized API network client
│   │   │   └── client.js                 # Axios/Fetch wrapper with JWT handling
│   │   │
│   │   ├── components/                   # App shell & reusable layout components
│   │   │   ├── BottomNav.jsx             # Mobile bottom navigation bar
│   │   │   ├── BottomNav.css             # BottomNav component styles
│   │   │   ├── Navbar.jsx                # Mobile top header & theme toggle
│   │   │   ├── Navbar.css                # Navbar component styles
│   │   │   ├── Sidebar.jsx               # Desktop side navigation drawer
│   │   │   ├── Sidebar.css               # Sidebar component styles
│   │   │   └── IosInstallModal.jsx       # Visual PWA install walkthrough for iOS
│   │   │
│   │   ├── context/                      # React Context state management
│   │   │   ├── AuthContext.jsx           # User authentication, tokens, and theme
│   │   │   └── NotificationContext.jsx   # Custom non-blocking top toast notifications
│   │   │
│   │   ├── pages/                        # Main application views (Component + CSS pairs)
│   │   │   ├── Analytics.jsx             # Analytics, PDF/Excel export & email tools
│   │   │   ├── Analytics.css             # Analytics page styles
│   │   │   ├── Dashboard.jsx             # Daily attendance, course cards & notes
│   │   │   ├── Dashboard.css             # Dashboard page styles
│   │   │   ├── History.jsx               # Monthly calendar & semester ledger log
│   │   │   ├── History.css               # History page styles
│   │   │   ├── Login.jsx                 # Authentication splash & Google OAuth
│   │   │   ├── Login.css                 # Login page styles
│   │   │   ├── Settings.jsx              # Semester dates, target slider & email time
│   │   │   ├── Settings.css              # Settings page styles
│   │   │   ├── Subjects.jsx              # Registered course catalogue & 75% audit
│   │   │   ├── Subjects.css              # Subjects page styles
│   │   │   ├── Timetable.jsx             # Weekly period matrix & Gemini AI scanner
│   │   │   └── Timetable.css             # Timetable page styles
│   │   │
│   │   ├── styles/                       # Global design system foundation
│   │   │   ├── variables.css             # CSS variables (colors, fonts, radii, themes)
│   │   │   ├── base.css                  # Universal reset, root typography & shell locks
│   │   │   ├── common.css                # Shared UI primitives (buttons, badges, modals)
│   │   │   └── global.css                # Master loader importing variables, base, common
│   │   │
│   │   ├── utils/                        # Shared utility helpers
│   │   │   ├── formatters.js             # 12-hour time and date display formatters
│   │   │   └── usePwaInstall.js          # Hook for native PWA installation prompts
│   │   │
│   │   ├── App.jsx                       # Root application shell & tab routing
│   │   └── main.jsx                      # Vite application entry point
│   │
│   ├── index.html                        # HTML shell with PWA meta tags & SW bootstrap
│   ├── package.json                      # Frontend dependencies and build scripts
│   └── vite.config.js                    # Vite bundler configuration (host: 0.0.0.0, API proxy)
│
├── server/                               # Backend REST API Service
│   ├── src/
│   │   ├── config/                       # Core configuration modules
│   │   │   └── db.js                     # MongoDB connection via Mongoose
│   │   │
│   │   ├── controllers/                  # Route controller logic
│   │   │   ├── analyticsController.js    # Semester summary, email triggers & AI insights
│   │   │   ├── attendanceController.js   # Today slots, mark/unmark, notes, history
│   │   │   ├── authController.js         # Google OAuth, demo login, profile settings
│   │   │   ├── subjectController.js      # CRUD subjects & mid-sem baseline calibration
│   │   │   └── timetableController.js    # Slot CRUD, bulk saves & Gemini AI scanner
│   │   │
│   │   ├── cron/                         # Background automation
│   │   │   └── emailScheduler.js         # Minute-evaluator for user email preferences
│   │   │
│   │   ├── middleware/                   # Express middlewares
│   │   │   ├── authMiddleware.js         # JWT verification & user injection
│   │   │   └── upload.js                 # Multer memory storage for timetable files
│   │   │
│   │   ├── models/                       # Mongoose database schemas
│   │   │   ├── AttendanceLog.js          # Attendance session records & notes
│   │   │   ├── Subject.js                # Course records, type, faculty, baselines
│   │   │   ├── TimetableSlot.js          # Day, period window, room, and subject link
│   │   │   └── User.js                   # Student credentials, target %, email preferences
│   │   │
│   │   ├── services/                     # External service adapters
│   │   │   ├── emailService.js           # Nodemailer transport & HTML digest builder
│   │   │   └── geminiService.js          # Google Gemini 2.5/Flash multimodal OCR
│   │   │
│   │   └── app.js                        # Express app, middleware stack & route registry
│   │
│   ├── server.js                         # Node.js HTTP server entrypoint
│   └── package.json                      # Backend dependencies and scripts
│
├── .gitignore                            # Git file exclusion rules
└── README.md                             # Technical project documentation
```

### Folder-by-Folder Specification

| Directory / File | Description & Engineering Responsibility |
| :--- | :--- |
| **`client/public/`** | Static assets served directly at root. Contains `manifest.json`, `sw.js`, and `favicon/` icons. |
| **`client/src/api/`** | Contains `client.js`, the centralized API wrapper configured with baseUrl resolution, auth token headers, and unified error handling. |
| **`client/src/components/`** | Reusable navigation and UI components (`Sidebar`, `Navbar`, `BottomNav`, `IosInstallModal`). Each component is paired with its own CSS file. |
| **`client/src/context/`** | React Context providers. `AuthContext` provides authentication, theme switching, and user profiles. `NotificationContext` powers non-blocking top toast alerts. |
| **`client/src/pages/`** | Core views for each tab (`Dashboard`, `Subjects`, `Timetable`, `History`, `Analytics`, `Settings`, `Login`). Each page has its own dedicated `.css` stylesheet. |
| **`client/src/styles/`** | Global design system. `variables.css` defines color and token variables. `base.css` handles resets. `common.css` provides buttons and badges. `global.css` acts as the master loader. |
| **`client/src/utils/`** | Helper utilities. `formatters.js` handles date/time conversions. `usePwaInstall.js` manages PWA `beforeinstallprompt` event state. |
| **`server/src/config/`** | Configuration files such as `db.js`, which manages the MongoDB lifecycle and event listeners. |
| **`server/src/controllers/`** | Business logic handlers handling request validation, database mutations, and formatted JSON responses. |
| **`server/src/cron/`** | Background jobs. `emailScheduler.js` checks every minute whether a student's preferred notification day and time matches the current clock. |
| **`server/src/middleware/`** | Express middlewares: `authMiddleware.js` for JWT authentication and `upload.js` for handling in-memory multipart uploads. |
| **`server/src/models/`** | Mongoose schemas representing the data layer: `User`, `Subject`, `TimetableSlot`, and `AttendanceLog`. |
| **`server/src/services/`** | Third-party adapters: `geminiService.js` communicates with Google Gemini AI; `emailService.js` constructs and sends styled HTML emails via Nodemailer. |

---

## 📱 Progressive Web App (PWA) & Mobile Installation

AttendTrack functions as an installable **Progressive Web App (PWA)**:

1. **Standalone Full-Screen:** When installed, the app opens without any browser address bar, navigation tabs, or footers.
2. **Offline Support:** The custom Service Worker (`client/public/sw.js`) caches app shell assets so the application loads instantly even under poor connectivity.
3. **How to Install on Mobile:**
   * **Android (Chrome / Edge / Brave):** Open the app in your mobile browser. Tap the **`📲 Install`** pill in the top header or select **"Install App"** from the browser menu.
   * **iOS (Safari):** Open the app in Safari, tap the **Share** button (`⎋`), scroll down, and select **"Add to Home Screen"** (`⊞`).
4. **Local Wi-Fi Testing:**  
   Vite is configured to listen on all network interfaces (`host: '0.0.0.0'`). Any device on the same local network can access the app via:
   ```text
   http://<YOUR_LOCAL_IP>:5173
   ```

---

## 🏁 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js:** v18.0.0 or higher
* **npm:** v9.0.0 or higher
* **MongoDB:** Local instance running on port `27017` or a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI.

---

### 2. Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/attendtrack.git
   cd attendtrack
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

---

### 3. Environment Configuration

Create a `.env` file in the `server/` directory:

```env
# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Connection
MONGODB_URI=mongodb://127.0.0.1:27017/attendtrack

# Security
JWT_SECRET=attendtrack_super_secret_jwt_key_2026

# Google OAuth (Optional for Demo Mode)
GOOGLE_CLIENT_ID=your_google_client_id_here

# Google Gemini API (For AI Timetable Ingestion)
GEMINI_API_KEY=your_gemini_api_key_here

# Automated Email Digest (SMTP Credentials)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

> 💡 **Demo Student Account Available:** If you haven't set up Google OAuth or SMTP credentials yet, click **"🚀 Open with Demo Student Account"** on the login page to immediately test all features.

---

### 4. Running Locally

#### Terminal 1 — Start Backend Server:
```bash
cd server
npm start
```
* Backend runs at: `http://localhost:5000`
* Healthcheck: `http://localhost:5000/health`

#### Terminal 2 — Start Frontend Client:
```bash
cd client
npm run dev
```
* Open your browser and navigate to: `http://localhost:5173`

---

## 🔌 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/google` | Sign in / register via Google OAuth | Public |
| `POST` | `/api/auth/dev-login` | Instant demo login for local testing | Public |
| `GET` | `/api/auth/me` | Retrieve profile and target percentage | Private |
| `PUT` | `/api/auth/settings` | Update alert preferences, semester dates, and target threshold | Private |

### Subjects & Courses (`/api/subjects`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/subjects` | Get all subjects with computed 75% compliance statistics | Private |
| `POST` | `/api/subjects` | Add a new course/subject | Private |
| `POST` | `/api/subjects/batch-baseline` | Quick mid-semester calibration baseline | Private |
| `PUT` | `/api/subjects/:id` | Update subject details (code, faculty, name) | Private |
| `DELETE` | `/api/subjects/:id` | Remove subject and associated logs | Private |

### Timetable (`/api/timetable`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/timetable` | Fetch all weekly scheduled periods | Private |
| `POST` | `/api/timetable/slot` | Add individual period slot | Private |
| `DELETE` | `/api/timetable/slot/:id` | Remove specific period slot | Private |
| `DELETE` | `/api/timetable/all` | Clear entire timetable and reset slots | Private |
| `POST` | `/api/timetable/bulk` | Bulk save/replace timetable slots | Private |
| `POST` | `/api/timetable/scan-ai` | Upload timetable image/PDF for Gemini OCR ingestion | Private |

### Daily Attendance (`/api/attendance`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance/today?date=YYYY-MM-DD` | Get slots and marked status for given date | Private |
| `POST` | `/api/attendance/mark` | Mark class as Present, Absent, or Cancelled | Private |
| `POST` | `/api/attendance/note` | Attach or update note/reason for an attendance session | Private |
| `POST` | `/api/attendance/unmark` | Reset/clear mark for a class slot | Private |
| `DELETE` | `/api/attendance/mark` | Alias to unmark a class slot | Private |
| `GET` | `/api/attendance/history` | Chronological audit log of all marked classes with notes | Private |
| `POST` | `/api/attendance/reset` | Reset all attendance counts to 0/0 across subjects | Private |

### Analytics & Reports (`/api/analytics`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/summary` | Aggregate semester attendance statistics | Private |
| `POST` | `/api/analytics/ai-insights` | Generate AI-driven attendance advisory notes | Private |
| `POST` | `/api/analytics/send-test-email` | Trigger immediate test dispatch of the email report | Private |

---

## 🤖 Automation & AI Integrations

* **Gemini Multimodal Timetable Ingestion:**  
  Allows students to take a photo of their physical or digital university schedule. The image is passed directly to the `@google/genai` multimodal pipeline, which outputs structured JSON mapping days, time windows, subject codes, and room numbers. Replacing a timetable automatically purges obsolete data.
* **Flexible Email Notification Scheduler:**  
  A background cron job runs every minute, checking each student's chosen delivery day and time (e.g., Sunday at 8:00 PM). It builds a responsive HTML email highlighting safe bunks, urgent shortages, and consecutive classes required to restore 75% standing.

---

## 📄 License & Attribution

This project is open-source and available under the [MIT License](LICENSE). Built to give students clarity, control, and stress-free academic attendance compliance.
