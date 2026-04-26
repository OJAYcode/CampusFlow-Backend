# CampusFlow Backend

CampusFlow is a modular university backend built with Node.js, Express, MongoDB, and Mongoose. It combines smart attendance with academic delivery features such as course management, materials, assignments, assessments, messaging, reporting, and admin oversight.

## What This Backend Supports

- Student registration only when the matric number exists in seeded institutional records
- Core and elective course enrollment with approval workflow
- Multiple lecturers assigned to a single course
- Smart attendance sessions with session code, geofence, duplicate prevention, and device reuse checks
- Course materials with multipart upload support
- Assignments and assignment submissions
- Online assessments with attempts and objective scoring hooks
- Announcements and course messaging
- Admin reporting, oversight, and audit-friendly operations
- Extensible face-verification placeholders for future attendance identity strengthening

## Tech Stack

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- `express-validator`
- `multer`
- Swagger UI
- Jest + Supertest

## Project Structure

```text
src/
  app.js
  server.js
  config/
  constants/
  controllers/
  middlewares/
  models/
  routes/v1/
  services/
  templates/email/
  utils/
  validators/
scripts/
tests/
uploads/
```

## Core Business Rules

1. A student cannot register unless the matric number exists in `seeded_students`.
2. Seeded student data is the source of truth for faculty, department, level, and programme mapping.
3. Core courses are auto-enrolled for verified students.
4. Electives are student-selected and stay pending until approved.
5. Only electives valid for the student's department, level, and semester can be selected.
6. A course can have multiple lecturers through a dedicated course-lecturer relationship.
7. Only assigned lecturers can manage course content and attendance for that course.
8. Only enrolled students can access protected course features.
9. Attendance validates session status, session code, enrollment, geofence, duplicate submission, and suspicious device reuse.
10. The attendance module is designed to support future identity-strengthening steps like registered-device policy, OTP, or face verification.

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- MongoDB running locally or remotely

### Install

```bash
npm install
```

### Configure Environment

Create `.env` from `.env.example`.

Important variables include:

```env
NODE_ENV=development
PORT=10000
MONGODB_URI=mongodb://127.0.0.1:27017/unitrack
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
JWT_RESET_SECRET=reset-secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
JWT_RESET_EXPIRES_IN=15m
FRONTEND_URL=http://localhost:3000
FRONTEND_RESET_PASSWORD_URL=http://localhost:3000/reset-password
BREVO_API_KEY=your-brevo-key
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=CampusFlow
```

### Seed Data

```bash
npm run seed:academic
npm run seed:students:v1
```

### Run

```bash
npm run dev
```

If port `10000` is already in use on your machine, change `PORT` in `.env` to a free port.

## API Overview

The active API is versioned under `/api/v1`.

### Auth

- `POST /api/v1/auth/student/register`
- `POST /api/v1/auth/student/login`
- `POST /api/v1/auth/lecturer/login`
- `POST /api/v1/auth/admin/login`
- `POST /api/v1/auth/refresh-token`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`

### Admin

- Manage faculties, departments, seeded students, lecturers, admins, courses, and course-lecturer assignments
- Review and approve or reject elective requests
- View attendance sessions, attendance records, materials, assignments, assessment attempts, communications, and audit logs
- Generate academic and attendance reports
- Export course reports as CSV or PDF

### Lecturers

- View assigned courses and course workspace summaries
- Create attendance sessions
- Upload materials
- Create, update, and delete assignments
- View and grade assignment submissions
- Create, update, and delete assessments
- View attempts
- Create announcements
- Send and receive course-related messages
- Export course reports

### Students

- View profile and enrollments
- View eligible electives and submit elective selections
- Access materials, assignments, assessments, announcements, and messages for enrolled courses
- Submit assignments
- Start and submit assessments
- Submit attendance for active sessions

### Shared Module Routes

- `/api/v1/attendance`
- `/api/v1/materials`
- `/api/v1/assignments`
- `/api/v1/assessments`
- `/api/v1/communication`

## Uploads

Multipart upload support is enabled with `multer`.

- Materials use the local `uploads/materials` path
- Assignment submissions use the local `uploads/assignments` path

The storage layer is intentionally simple and can later be swapped for S3, Cloudinary, or another provider through the storage service abstraction.

## Reporting

Current reporting coverage includes:

- Attendance by course
- Enrollment summary
- Assignment summary
- Assessment summary
- Combined course academic report
- CSV/PDF export for course academic reports

## Testing

Run the suite with:

```bash
npm test -- --runInBand
```

Current automated coverage includes:

- app smoke checks
- auth service behavior
- enrollment service behavior
- attendance anti-fraud service behavior

## Deployment

This backend is ready to deploy on Render or Railway as a standard Node web service.

### Start Command

```bash
npm start
```

### Build Command

```bash
npm install
```

### Health Check

Use:

```text
/health
```

### Required Environment Variables

- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `JWT_RESET_SECRET`
- `JWT_RESET_EXPIRES_IN`
- `FRONTEND_URL`
- `FRONTEND_RESET_PASSWORD_URL`

### Optional Environment Variables

- `BREVO_API_KEY`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME`
- `WEB_PUSH_PUBLIC_KEY`
- `WEB_PUSH_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `BCRYPT_ROUNDS`

### Render Notes

- Root directory: repository root
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

### Railway Notes

- Root directory: repository root
- Build command: auto-detected, or `npm install`
- Start command: `npm start`
- Exposed port: use Railway provided `PORT`

## Swagger

Swagger UI is mounted from the runtime and documents the versioned API through the app bootstrap in `src/app.js`.

## Email and Password Reset

Password reset is integrated into the modular auth layer. The backend can send reset links through the Brevo-backed email service using the templates in `src/templates/email/`.

## Face Verification Hooks

The attendance flow already includes future-ready fields for biometric verification:

- `attendance_sessions.faceVerificationEnabled`
- `attendance_records.faceImageUrl`
- `attendance_records.faceMatchScore`
- `attendance_records.faceVerificationStatus`
- `face_verification_logs`

These fields are placeholders only. A biometric provider can be integrated later without redesigning the attendance module.

## Status

The legacy runtime has been removed. The repository now targets the modular `/api/v1` backend only. See `LEGACY_STATUS.md` and `API_V1_SUMMARY.md` for implementation notes.
