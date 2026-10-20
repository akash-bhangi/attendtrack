# 🎓 AttendTrack — Academic Attendance Management & 75% Compliance Engine

[![React](https://img.shields.io/badge/Frontend-React%2019-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%208-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Mongoose-47a248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20Vision-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Styling](https://img.shields.io/badge/CSS-Pure%20Vanilla%20CSS-1572B6?logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)

**AttendTrack** is a production-ready, full-stack web application engineered for college and university students. It eliminates attendance anxiety by automating daily logging, parsing university timetables via **Gemini Vision AI**, forecasting real-time **safe bunk buffers** against institutional 75% rules, dispatching weekly email summaries, and exporting formal audit reports (PDF & Excel).

---

## 📑 Table of Contents

- [Overview & The Problem](#-overview--the-problem)
- [Key Features](#-key-features)
- [Mathematical Logic Engine (75% Criteria)](#-mathematical-logic-engine-75-criteria)
- [Technology Stack](#-technology-stack)
- [System Architecture & Folder Structure](#-system-architecture--folder-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#1-prerequisites)
  - [Installation & Setup](#2-installation--setup)
  - [Environment Configuration](#3-environment-configuration)
  - [Running Locally](#4-running-locally)
- [API Reference](#-api-reference)
- [Automation & AI Integrations](#-automation--ai-integrations)
- [Contributing & License](#-contributing--license)

---

## 💡 Overview & The Problem

Most universities enforce a mandatory minimum attendance threshold (typically **75%**) to qualify for final examinations. Calculating attendance manually or relying on memory often leads to:
* Surprise shortages right before exam debarment deadlines.
* Miscalculating how many classes can safely be missed during illness, internships, or college fests.
* Tedious daily record-keeping across multiple lectures and lab sessions.

**AttendTrack** solves this with automated daily timetable detection, one-tap marking, instant margin calculation, and actionable recovery trajectories.

---

## 🚀 Key Features

### 📅 1. Standalone Timetable Module
* **Matrix View:** Period-by-period visual timetable spanning Monday to Saturday.
* **Slot Builder:** Specify time windows, course codes, course names, room numbers, and faculty details.
* **🤖 Gemini Vision AI Ingestion:** Upload an image or PDF of your university timetable — Gemini automatically reads the matrix and populates courses and slots in seconds.

### ⏱️ 2. One-Tap Daily Attendance Logging
* **Timetable Sync:** Daily dashboard automatically displays only the classes scheduled for the selected day.
* **Quick-Action Buttons:**
  * `Present` — Logs attendance (+1 attended, +1 conducted).
  * `Absent` — Logs absence (0 attended, +1 conducted).
  * `Cancelled` — Marks class suspended/cancelled with zero penalty (0 attended, 0 conducted).
* **Date Navigator:** Intuitive date-strip bar to review past days or mark missed logs.
* **Mid-Semester Quick Catch-Up:** Join midway through the semester? Input initial baseline numbers directly without backdating manual logs.

### 🧮 3. Predictive 75% Compliance Math Engine
* Live calculation of **Safe Bunks** and **Consecutive Recovery Classes Needed**.
* Visual status tiering:
  * 🟢 **Safe:** $\ge 75\%$
  * 🟡 **Warning:** $75\% \le \text{Percentage} < 78\%$
  * 🔴 **Shortage / Danger Zone:** $< 75\%$

### 📧 4. Automated Weekly Email Digest
* Built-in `node-cron` background scheduler delivers a formatted Sunday digest.
* Outlines weekly statistics, subject breakdown, and early-warning alerts directly to the student's inbox.

### 📊 5. Export Suite (PDF & Excel)
* **Official PDF Audit Dossier:** Formatted, print-ready document with summary KPIs and individual subject logs.
* **Raw Excel Workbook (.xlsx):** Detailed breakdown exported for personal record-keeping.

### 🎨 6. Handcrafted Responsive Design System
* Built with **100% pure vanilla CSS** utilizing custom tokens (no heavy utility frameworks like Tailwind).
* Seamless light and dark mode toggle.
* Fully responsive layout optimized for mobile screens (360px+) through wide desktop displays.

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
| **Frontend Framework** | React 19 + Vite 8 | Ultra-fast client-side rendering and build tooling |
| **Styling** | Vanilla CSS3 (Custom Variables) | Lightweight, zero-dependency design system with light/dark themes |
| **Backend Framework** | Node.js + Express 5 | Scalable REST API with modular architecture |
| **Database** | MongoDB + Mongoose 9 | Document store for users, subjects, timetables, and logs |
| **Multimodal AI** | Google Gemini (`@google/genai`) | Automated timetable image/PDF OCR and parsing |
| **Authentication** | Google OAuth 2.0 + JWT | Secure user identity verification + One-Click Demo Mode |
| **Scheduling & Mail** | `node-cron` + `nodemailer` | Automated Sunday email reports via SMTP |
| **Document Export** | `jspdf`, `jspdf-autotable`, `xlsx` | In-browser client-side PDF and Excel report generation |

---

## 📁 System Architecture & Folder Structure

```text
Attendence Marker/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI widgets (Navbar, Modals, Badges)
│   │   ├── context/            # React context providers (Auth, Theme)
│   │   ├── pages/              # Views (Dashboard, Timetable, Subjects, History, Analytics)
│   │   ├── styles/             # Global CSS design tokens and theme variables
│   │   ├── App.jsx             # Route definitions and layout wrappers
│   │   └── main.jsx            # React root mount point
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Database connection & third-party setup
│   │   ├── controllers/        # Request handlers (auth, subjects, timetable, attendance)
│   │   ├── cron/               # Sunday automated email digest scheduler
│   │   ├── middleware/         # JWT verification, upload handlers
│   │   ├── models/             # Mongoose schemas (User, Subject, TimetableSlot, AttendanceLog)
│   │   └── app.js              # Express app and route registrations
│   ├── server.js               # HTTP server entrypoint
│   └── package.json
│
├── .gitignore                  # Git tracking rules
└── README.md                   # Project documentation
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

# Google OAuth (Optional for Demo mode)
GOOGLE_CLIENT_ID=your_google_client_id_here

# Google Gemini API (For AI Timetable Ingestion)
GEMINI_API_KEY=your_gemini_api_key_here

# Automated Email Digest (SMTP Credentials)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

> 💡 **Demo Student Account Available:** If you haven't set up Google OAuth or SMTP credentials yet, you can use the built-in **"🚀 Open with Demo Student Account"** on the login page to immediately test all features.

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
| `GET` | `/api/auth/me` | Retrieve profile and institutional target percentage | Private |
| `PUT` | `/api/auth/settings` | Update alert preferences and target threshold | Private |

### Subjects & Courses (`/api/subjects`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/subjects` | Get subjects with computed 75% statistics | Private |
| `POST` | `/api/subjects` | Add a new course/subject | Private |
| `POST` | `/api/subjects/batch-baseline` | Quick mid-semester calibration baseline | Private |
| `PUT` | `/api/subjects/:id` | Update subject details | Private |
| `DELETE` | `/api/subjects/:id` | Remove subject and associated logs | Private |

### Timetable (`/api/timetable`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/timetable` | Fetch all weekly scheduled periods | Private |
| `POST` | `/api/timetable/slot` | Add individual period slot | Private |
| `POST` | `/api/timetable/scan-ai` | Upload timetable image/PDF for Gemini OCR ingestion | Private |
| `DELETE` | `/api/timetable/all` | Clear entire timetable | Private |

### Daily Attendance (`/api/attendance`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/attendance/today?date=YYYY-MM-DD` | Get slots and mark status for given date | Private |
| `POST` | `/api/attendance/mark` | Mark class as Present, Absent, or Cancelled | Private |
| `POST` | `/api/attendance/unmark` | Reset/clear mark for a class slot | Private |
| `GET` | `/api/attendance/history` | Chronological audit log of all marked classes | Private |

### Analytics & Reports (`/api/analytics`)
| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analytics/summary` | Aggregate semester attendance statistics | Private |
| `POST` | `/api/analytics/ai-insights` | Generate AI-driven attendance advisory notes | Private |
| `POST` | `/api/analytics/send-test-email` | Trigger immediate test dispatch of the Sunday mailer | Private |

---

## 🤖 Automation & AI Integrations

* **Gemini Multimodal Timetable Ingestion:**  
  Allows students to take a photo of their physical or digital university schedule. The image is passed directly to the `@google/genai` multimodal pipeline, which outputs structured JSON mapping days, time windows, subject codes, and room numbers.
* **Sunday Night Email Digest:**  
  A background cron job runs automatically every Sunday at 8:00 PM (`0 20 * * 0`). It checks each student's standing and dispatches an actionable report highlighting high-margin courses and critical deficit warnings.

---

## 📄 License & Attribution

This project is open-source and available under the [MIT License](LICENSE). Built for students to simplify academic tracking and achieve stress-free compliance.
