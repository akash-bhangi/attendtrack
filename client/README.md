# AttendTrack Web Client

Mobile-first responsive frontend for AttendTrack built with React 19 and Vite.

---

## Architectural Rules
- **Pure Custom CSS**: Strict no-framework policy (zero Tailwind, zero external component bloat). Tokens are defined in `src/styles/variables.css`.
- **Thumb-Zone Optimization**: Bottom navigation bar and action buttons (`Present`, `Absent`, `Cancelled`) placed for effortless mobile thumb reach.
- **Instantaneous Feedback**: Optimistic attendance toggling with real-time recalculation of 75% thresholds.

---

## Setup & Running

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Configure Environment:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. **Start Development Server:**
   ```bash
   npm run dev
   ```

Refer to the main [README.md](file:///c:/Users/bhang/OneDrive/Desktop/Documents/Attendence%20Marker/README.md) and [ENVIRONMENT.md](file:///c:/Users/bhang/OneDrive/Desktop/Documents/Attendence%20Marker/ENVIRONMENT.md) for full setup instructions.
