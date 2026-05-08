# CampusFlow Backend

A production-grade **Node.js + Express + MongoDB** API server powering real-time attendance tracking, course management, and academic operations. Features immediate push notifications via **Server-Sent Events (SSE)** and **Web Push**, secure JWT authentication, and comprehensive role-based access control.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Authentication & Security](#authentication--security)
- [Real-time Features](#real-time-features)
- [Email Configuration](#email-configuration)
- [File Uploads](#file-uploads)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 📱 Overview

**CampusFlow Backend** is the core API server orchestrating all academic operations:

- **Attendance Management**: GPS-validated geofence sessions, real-time student tracking
- **Course & Lecturers**: Multi-course enrollment, lecturer permissions, course announcements
- **Announcements & Notifications**: Immediate SSE push + background Web Push via VAPID
- **Assessments & Assignments**: Assignment distribution, submission tracking, grading
- **Authentication**: JWT tokens, refresh flows, device fingerprinting, multi-role support
- **Email Delivery**: Transactional emails via Brevo (Sendinblue), welcome/reset templates

### Deployment
- **Production**: Render (render.com) with auto-deploy on Git push
- **Database**: MongoDB Atlas (cloud)
- **Email**: Brevo API
- **Push Notifications**: Web Push VAPID keys (configurable)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│           CampusFlow Backend (Node.js/Express)               │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Next.js/Express Server (Port 4000)        │   │
│  │  • REST API with role-based middleware              │   │
│  │  • SSE endpoint for real-time announcement streams  │   │
│  │  • JWT interceptors & refresh token flow            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Route Handlers (v1 API)                    │   │
│  │  • Authentication (login, register, refresh)        │   │
│  │  • Students (profile, enrollments, history)         │   │
│  │  • Lecturers (courses, announcements, sessions)     │   │
│  │  • Attendance (geofence validation, tracking)       │   │
│  │  • Assignments & Assessments                        │   │
│  │  • Notifications (SSE, Web Push, email)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Service Layer                              │   │
│  │  • JWT token generation & validation                │   │
│  │  • Email templating & delivery (Brevo)             │   │
│  │  • Geofence radius calculations                     │   │
│  │  • SSE client management (in-memory)                │   │
│  │  • Web Push subscription handling (VAPID)           │   │
│  │  • Attendance & course business logic               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Data Layer (Mongoose/MongoDB)             │   │
│  │  Models:                                             │   │
│  │  • User (admin, lecturer, student with roles)       │   │
│  │  • Course (enrollment, curriculum, codes)           │   │
│  │  • AttendanceSession (geofence, students, status)   │   │
│  │  • Assignment (files, deadlines, submissions)       │   │
│  │  • Assessment (questions, results, progress)        │   │
│  │  • Announcement (content, recipients, SSE push)     │   │
│  │  • PushSubscription (VAPID endpoints)               │   │
│  │  • Notification (per-user records for push)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           External Services                          │   │
│  │  • Brevo (email delivery)                            │   │
│  │  • MongoDB Atlas (database)                          │   │
│  │  • Render (hosting)                                  │   │
│  │  • Web-push library (VAPID signing)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Client Request** → Attach JWT token in `Authorization: Bearer <token>`
2. **Middleware** → Verify JWT, extract `userId` and `role`
3. **Route Handler** → Check permissions, validate input
4. **Service Layer** → Business logic, database queries
5. **Response** → JSON with status code or error details
6. **Real-time** → SSE subscribers notified, Web Push queued if subscriptions exist

---

## 🛠️ Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 22.x | JavaScript runtime |
| **Web Framework** | Express | 4.18+ | HTTP server & routing |
| **Database** | MongoDB | 7.x | NoSQL document store |
| **ODM** | Mongoose | 7.5+ | MongoDB schema & validation |
| **Authentication** | JWT (jsonwebtoken) | 9.0+ | Token-based auth |
| **Password Hashing** | bcrypt | 5.1+ | Secure password storage |
| **Email Service** | Brevo API | @getbrevo/brevo 5.0+ | Transactional emails |
| **Push Notifications** | web-push | 3.6+ | VAPID Web Push signing |
| **Email Templates** | Handlebars | 4.7+ | Template rendering |
| **File Conversion** | mammoth | 1.12+ | DOCX to HTML |
| **QR Codes** | qrcode | 1.5+ | Session code generation |
| **PDF Export** | pdfkit | 0.13+ | PDF generation |
| **CSV Parsing** | fast-csv | 4.3+ | CSV import/export |
| **Rate Limiting** | express-rate-limit | 6.8+ | API throttling |
| **Validation** | express-validator | 7.0+ | Input validation |
| **CORS** | cors | 2.8+ | Cross-origin handling |
| **Security** | helmet | 7.0+ | HTTP headers hardening |
| **Environment** | dotenv | 16.3+ | Environment variable loading |
| **API Docs** | Swagger/OpenAPI | Latest | API documentation |
| **Dev Runtime** | Nodemon | 3.0+ | Auto-reload on changes |
| **Testing** | Jest | 29.6+ | Unit/integration tests |

---

## 📁 Project Structure

```
UniTrack-Backend/
├── src/
│   ├── server.js                  # Express app entry point, middleware setup
│   ├── app.js                     # Middleware configuration (CORS, parsing, etc.)
│   │
│   ├── routes/
│   │   └── v1/
│   │       ├── auth.routes.js     # Login, register, refresh token, password reset
│   │       ├── student.routes.js  # Student profile, enrollments, history
│   │       ├── lecturer.routes.js # Courses, announcements, session management
│   │       ├── attendance.routes.js # Session creation, attendance submission
│   │       ├── assignment.routes.js # Assignment distribution & submission
│   │       ├── assessment.routes.js # Assessments & question handling
│   │       ├── notification.routes.js # SSE stream, Web Push, email preferences
│   │       ├── user.routes.js     # User management (admin)
│   │       └── shared.routes.js   # Shared endpoints (health check, etc.)
│   │
│   ├── controllers/
│   │   ├── auth.controller.js     # Login/register logic, JWT generation
│   │   ├── student.controller.js  # Student profile, enrollments
│   │   ├── lecturer.controller.js # Course creation, announcement publish
│   │   ├── attendance.controller.js # Session creation, student tracking
│   │   ├── assignment.controller.js # Assignment CRUD, submissions
│   │   ├── assessment.controller.js # Question/result management
│   │   ├── notification.controller.js # SSE stream, Web Push endpoints
│   │   └── shared.controller.js   # Generic handlers
│   │
│   ├── models/
│   │   ├── User.js                # Schema: admin, lecturer, student (role-based)
│   │   ├── Course.js              # Schema: course details, enrollment
│   │   ├── AttendanceSession.js    # Schema: geofence, students, timestamps
│   │   ├── Attendance.js           # Schema: per-student attendance record
│   │   ├── Assignment.js           # Schema: file, deadline, submissions
│   │   ├── Assessment.js           # Schema: quiz/exam structure
│   │   ├── Announcement.js         # Schema: message, recipients, publish date
│   │   ├── PushSubscription.js     # Schema: VAPID endpoint + keys
│   │   ├── Notification.js         # Schema: per-user notification record
│   │   ├── Departement.js          # Schema: department hierarchy
│   │   ├── Semester.js             # Schema: semester calendar
│   │   └── Enrollment.js           # Schema: student-course enrollment
│   │
│   ├── services/
│   │   ├── token.service.js        # JWT generation, validation, refresh
│   │   ├── email.service.js        # Brevo API calls, template rendering
│   │   ├── attendance.service.js   # Geofence math, validation logic
│   │   ├── announcement-stream.service.js # SSE client registry & broadcasts
│   │   ├── pushNotification.service.js # Web Push subscription & sending (VAPID)
│   │   ├── file.service.js         # File upload handling, storage
│   │   └── ...other services
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification, role extraction
│   │   ├── validate.middleware.js  # Input validation chain
│   │   ├── errorHandler.middleware.js # Error response standardization
│   │   ├── rateLimiter.middleware.js # Throttling by user/IP
│   │   └── cors.middleware.js      # CORS policy enforcement
│   │
│   ├── templates/
│   │   ├── email/
│   │   │   ├── welcome.hbs        # New user welcome email
│   │   │   ├── password-reset.hbs # Password reset link
│   │   │   ├── announcement.hbs   # New announcement notification
│   │   │   └── ...others
│   │   └── ...
│   │
│   ├── config/
│   │   ├── database.js            # MongoDB connection
│   │   ├── jwt.js                 # Token secrets & options
│   │   └── email.js               # Brevo configuration
│   │
│   └── utils/
│       ├── error.js               # Custom error classes
│       ├── response.js            # API response standardization
│       ├── logger.js              # Logging utility
│       └── validators.js          # Validation helpers
│
├── scripts/
│   ├── seed-academic-structure.js # Populate initial departments/courses
│   ├── seed-students-v1.js        # Batch student creation
│   └── generate-vapid-keys.js     # Web Push key generation
│
├── uploads/                       # File upload storage (development)
│   ├── assignments/
│   ├── submissions/
│   └── ...
│
├── server-logs/                   # Request/error logs
│   ├── access.log
│   ├── error.log
│   └── ...
│
├── tests/                         # Test suites
│   ├── auth.test.js
│   ├── attendance.test.js
│   └── ...
│
├── .env.example                   # Environment variable template
├── .env                           # Actual secrets (DO NOT COMMIT)
├── .gitignore                     # Git ignore patterns
├── package.json                   # Dependencies & scripts
├── package-lock.json              # Dependency lock
├── jest.config.js                 # Test runner configuration
├── render.yaml                    # Render deployment config
└── README.md                      # This file
```

---

## ✨ Key Features

### 1. **Role-Based Access Control (RBAC)**
- **Student**: View profile, enroll in courses, submit attendance, view assignments
- **Lecturer**: Create courses, start sessions, publish announcements, grade assignments
- **Admin**: User management, system configuration, reporting
- Implemented via middleware that checks `req.user.role` on protected routes

### 2. **Real-time Announcements**
- **SSE Streaming**: In-memory client registry broadcasts to active sessions
- **Web Push VAPID**: Background notifications when browser closed (service worker receives)
- **Fallback Polling**: Client-side 10s polling if SSE unavailable
- **Cookie-based Auth**: Secure same-origin EventSource authentication
- Endpoint: `GET /api/v1/notifications/stream` (with JWT token)

### 3. **Geofence-based Attendance**
- **GPS Validation**: Accept location only within configurable radius (meters)
- **Session Tracking**: Per-student attendance records with timestamps
- **QR Code**: Session code generation for quick enrollment
- **Live Map**: Lecturer sees student markers on geofence boundary
- Endpoint: `POST /api/v1/sessions/:id/attendance` (with lat/lng)

### 4. **JWT Authentication**
- **Access Token**: Short-lived (e.g., 15m) for API requests
- **Refresh Token**: Long-lived (e.g., 7d) to obtain new access token
- **Token Refresh**: Automatic refresh on 401 response (client-side)
- **Device Fingerprinting**: Optional device ID linking to prevent token theft
- Endpoints: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`

### 5. **Email Delivery**
- **Brevo Integration**: Transactional emails at scale
- **Handlebars Templates**: Dynamic email content with variables
- **Bulk Sending**: Send to multiple recipients (course enrollment)
- **Welcome & Reset**: Email templates for onboarding & password recovery
- Service: `src/services/email.service.js`

### 6. **File Management**
- **Upload Storage**: Files stored locally (development) or cloud (production)
- **Assignment Files**: Support DOCX, PDF, images, videos
- **Submission Tracking**: Per-student submission records with timestamps
- **Validation**: File type & size restrictions
- Endpoint: `POST /api/v1/assignments/:id/submit`

### 7. **Comprehensive API Documentation**
- **Swagger/OpenAPI**: Automatically generated API docs at `/api-docs`
- **Endpoint Examples**: Every route documented with request/response samples
- **Error Codes**: Standard HTTP status codes + custom error messages

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** ≥ 18.x (recommend 22.x+)
- **npm** ≥ 9.x or **yarn**
- **MongoDB** (local or Atlas cloud)
- **Git** configured
- **Brevo Account** (for email) – optional for dev

### 1. Clone Repository

```bash
git clone https://github.com/OJAYcode/CampusFlow-Backend.git
cd UniTrack-Backend/UniTrack-Backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` file at project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) section below).

### 4. Connect to MongoDB

```bash
# Ensure MongoDB is running (local or Atlas)
# Test connection:
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/campusflow"
```

### 5. Start Development Server

```bash
npm run dev
# Server runs at http://localhost:4000
# Logs shown in terminal
# Auto-reloads on file changes (nodemon)
```

### 6. Seed Initial Data (Optional)

```bash
# Populate departments, courses, semesters
npm run seed:academic

# Create test students in bulk
npm run seed:students:v1
```

---

## 🔧 Environment Variables

Create `.env` file with these variables:

```env
# ==================== Core ====================
NODE_ENV=development                           # or 'production'
PORT=4000                                      # Express server port
SERVER_URL=http://localhost:4000               # For email links in dev

# ==================== Database ====================
MONGODB_URI=mongodb://localhost:27017/campusflow  # Local
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/campusflow

DB_NAME=campusflow                             # Database name

# ==================== Authentication ====================
JWT_SECRET=your_super_secret_key_min_32_chars_here  # Change in production!
JWT_EXPIRY=15m                                 # Access token lifetime
JWT_REFRESH_SECRET=refresh_secret_key_here
JWT_REFRESH_EXPIRY=7d

# ==================== Email (Brevo) ====================
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_NAME=CampusFlow
BREVO_SENDER_EMAIL=noreply@campusflow.com

# ==================== Web Push (VAPID) ====================
# Generate with: npm run push:keys
WEB_PUSH_PUBLIC_KEY=your_public_key_here
WEB_PUSH_PRIVATE_KEY=your_private_key_here
WEB_PUSH_SUBJECT=mailto:your-email@example.com

# ==================== External Services ====================
GOOGLE_MAPS_API_KEY=your_google_maps_key_here  # For geolocation (optional)

# ==================== Frontend URLs ====================
FRONTEND_URL=http://localhost:3000             # For CORS, email links
FRONTEND_STUDENT_URL=http://localhost:3000     # Student portal
FRONTEND_STAFF_URL=http://localhost:3001       # Staff portal (if split)

# ==================== File Uploads ====================
UPLOAD_DIR=./uploads                           # Local upload directory
MAX_FILE_SIZE=52428800                         # 50MB in bytes

# ==================== Logging ====================
LOG_LEVEL=debug                                # debug, info, warn, error

# ==================== Rate Limiting ====================
RATE_LIMIT_WINDOW_MS=900000                    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100                    # Per IP/user
```

### VAPID Key Generation

```bash
npm run push:keys
# Outputs:
# Public Key: <key_here>
# Private Key: <key_here>
# Subject: mailto:your-email@example.com

# Copy keys to .env
```

---

## 🗄️ Database Setup

### MongoDB Connection

#### Local MongoDB
```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Connection string in .env
MONGODB_URI=mongodb://localhost:27017/campusflow
```

#### MongoDB Atlas (Cloud)
1. Create cluster at [mongodb.com/cloud](https://www.mongodb.com/cloud)
2. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/campusflow`
3. Update `.env` with connection string
4. Ensure IP whitelist allows your server

### Database Initialization

Mongoose auto-creates collections on first write. To seed initial data:

```bash
npm run seed:academic        # Create departments, courses, semesters
npm run seed:students:v1     # Bulk import students from CSV
```

### Collections Overview

| Collection | Purpose | Sample Fields |
|-----------|---------|---------------|
| `users` | All users (student/lecturer/admin) | `email`, `password`, `role`, `fullName` |
| `courses` | Course definitions | `title`, `code`, `lecturer`, `students` |
| `enrollments` | Student-course relationships | `student`, `course`, `enrolledAt` |
| `attendancesessions` | Geofence session records | `course`, `latitude`, `longitude`, `radius`, `code` |
| `attendances` | Per-student attendance | `session`, `student`, `status`, `timestamp` |
| `assignments` | Assignment definitions | `course`, `title`, `deadline`, `file` |
| `submissions` | Student submissions | `assignment`, `student`, `file`, `submittedAt` |
| `assessments` | Quiz/exam structure | `course`, `questions`, `duration` |
| `announcements` | Course announcements | `course`, `title`, `body`, `createdAt` |
| `pushsubscriptions` | VAPID subscriptions | `user`, `endpoint`, `keys` |
| `notifications` | User notification records | `user`, `announcement`, `readAt` |

---

## 📚 API Documentation

### Authentication Endpoints

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}

Response 200:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "123",
    "email": "student@example.com",
    "fullName": "John Doe",
    "role": "student"
  }
}
```

#### Register Student
```bash
POST /api/v1/auth/register-student
{
  "email": "new@example.com",
  "password": "password123",
  "fullName": "Jane Doe",
  "matricNumber": "STU-2024-001"
}
```

#### Refresh Token
```bash
POST /api/v1/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

Response 200:
{
  "accessToken": "eyJhbGc..." # New access token
}
```

### Student Endpoints

#### Get Profile
```bash
GET /api/v1/students/profile
Authorization: Bearer <accessToken>

Response 200:
{
  "data": {
    "id": "123",
    "fullName": "John Doe",
    "email": "john@example.com",
    "matricNumber": "STU-2024-001",
    "enrollments": 5
  }
}
```

#### Get Enrollments
```bash
GET /api/v1/students/enrollments
Authorization: Bearer <accessToken>

Response 200:
{
  "data": [
    {
      "course": { "id": "c1", "title": "Mathematics", "code": "MATH101" },
      "enrolledAt": "2024-01-15",
      "status": "active"
    }
  ]
}
```

#### Get Announcements
```bash
GET /api/v1/announcements
Authorization: Bearer <accessToken>

Response 200:
{
  "data": [
    {
      "id": "ann1",
      "title": "Class Cancelled Tomorrow",
      "body": "Due to system maintenance...",
      "course": "c1",
      "createdAt": "2024-05-08T10:30:00Z"
    }
  ]
}
```

### Lecturer Endpoints

#### Start Attendance Session
```bash
POST /api/v1/attendance/sessions/start
Authorization: Bearer <accessToken>
{
  "courseId": "c1",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 100,
  "durationMinutes": 30,
  "roomLabel": "Engineering Block A, Room 204"
}

Response 201:
{
  "data": {
    "id": "session123",
    "code": "ABC123",  # QR code
    "qrCodeUrl": "data:image/png;base64,...",
    "expiresAt": "2024-05-08T11:00:00Z"
  }
}
```

#### Publish Announcement
```bash
POST /api/v1/announcements
Authorization: Bearer <accessToken>
{
  "courseId": "c1",
  "title": "New Assignment Released",
  "body": "See assignments section for details"
}

Response 201:
{
  "data": {
    "id": "ann1",
    "createdAt": "2024-05-08T10:30:00Z"
  }
}
```

### Attendance Endpoints

#### Submit Attendance
```bash
POST /api/v1/sessions/:sessionId/attendance
Authorization: Bearer <accessToken>
{
  "latitude": 40.7130,
  "longitude": -74.0061
}

Response 200:
{
  "data": {
    "status": "present",  # or "out_of_range"
    "accuracy": 15,       # meters
    "timestamp": "2024-05-08T10:35:00Z"
  }
}
```

#### Get Attendance History
```bash
GET /api/v1/attendance/history
Authorization: Bearer <accessToken>

Response 200:
{
  "data": [
    {
      "course": "Mathematics",
      "session": "SESSION-001",
      "status": "present",
      "submittedAt": "2024-05-08T10:35:00Z"
    }
  ]
}
```

### Real-time Endpoints

#### SSE Stream
```bash
GET /api/v1/notifications/stream?token=<accessToken>
# or
GET /api/v1/notifications/stream
Authorization: Bearer <accessToken>

# Server streams events (keep-alive):
event: announcement
data: {"id":"ann1","title":"New Assignment","body":"..."}

event: heartbeat
data: {}
```

#### Issue SSE Cookie
```bash
POST /api/v1/notifications/sse-cookie
Authorization: Bearer <accessToken>

# Response sets cf_sse cookie (short-lived JWT)
# Now EventSource can connect without token param
```

#### List SSE Clients
```bash
GET /api/v1/notifications/clients
Authorization: Bearer <lecturerToken>

Response 200:
{
  "data": {
    "user123": 2,    # 2 active clients
    "user456": 1     # 1 active client
  }
}
```

### Web Push Endpoints

#### Get Public Key
```bash
GET /api/v1/notifications/push/public-config
Response 200:
{
  "data": {
    "enabled": true,
    "publicKey": "BC..."
  }
}
```

#### Subscribe to Push
```bash
POST /api/v1/notifications/push/subscriptions
Authorization: Bearer <accessToken>
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  },
  "portal": "student"
}

Response 201:
{
  "data": { "id": "sub123", "createdAt": "..." }
}
```

---

## 🔐 Authentication & Security

### JWT Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /login (email, password)
       ▼
┌──────────────────┐
│  Auth Controller │────► Check credentials
│                  │
│ Generate tokens: │
│ - accessToken    │      (Valid 15m)
│ - refreshToken   │      (Valid 7d)
└──────┬───────────┘
       │
       ▼
┌─────────────┐
│   Client    │ Stores in localStorage
└──────┬──────┘
       │ GET /students/profile
       │ Authorization: Bearer <accessToken>
       ▼
┌──────────────────────┐
│  Auth Middleware     │──► Verify JWT signature
│                      │
│ Extract userId, role │
└──────┬───────────────┘
       │ (Valid)
       ▼
┌──────────────────┐
│   Route Handler  │──► Access req.user
└──────────────────┘

       ▼ After 15 minutes
┌─────────────────────┐
│  401 Unauthorized   │ (accessToken expired)
└──────┬──────────────┘
       │ POST /refresh (refreshToken)
       ▼
┌───────────────────────┐
│ Verify refreshToken   │──► Issue new accessToken
└──────┬────────────────┘
       │
       ▼ Continue with new token
```

### Password Security
- Passwords hashed with **bcrypt** (10 rounds)
- Never stored or logged in plaintext
- Reset via email link (temporary JWT token)

### API Security
- **CORS**: Restricted to frontend origins
- **Helmet**: HTTP headers hardening
- **Rate Limiting**: 100 requests per 15 minutes
- **Input Validation**: All inputs validated & sanitized
- **HTTPS**: Required in production (Render auto-enforces)

---

## ⚡ Real-time Features

### SSE Implementation

**Backend** (`src/services/announcement-stream.service.js`):
```javascript
// In-memory registry
const clientsByUser = new Map();

function subscribe(userId, res) {
  if (!clientsByUser.has(userId)) clientsByUser.set(userId, []);
  clientsByUser.get(userId).push(res);

  // Clean up on disconnect
  res.on('close', () => {
    const list = clientsByUser.get(userId) || [];
    clientsByUser.set(userId, list.filter(r => r !== res));
  });
}

function notifyForUsers(userIds, payload) {
  const asJson = JSON.stringify(payload);
  userIds.forEach(uid => {
    (clientsByUser.get(String(uid)) || []).forEach(res => {
      try {
        res.write(`event: announcement\ndata: ${asJson}\n\n`);
      } catch (e) {
        // Ignore individual errors
      }
    });
  });
}
```

**Usage** (in lecture.controller.js):
```javascript
// When lecturer publishes announcement
await Announcement.create({ courseId, title, body });

// Notify all enrolled students
const studentIds = enrollments.map(e => e.student);
notifyForUsers(studentIds, { id, title, body });
```

### Web Push with VAPID

**Backend** (`src/services/pushNotification.service.js`):
```javascript
const webpush = require('web-push');

webpush.setVapidDetails(
  process.env.WEB_PUSH_SUBJECT,
  process.env.WEB_PUSH_PUBLIC_KEY,
  process.env.WEB_PUSH_PRIVATE_KEY
);

async function notifySubscriptions(subscriptions, payload) {
  const promises = subscriptions.map(sub =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(payload)
    ).catch(err => console.error('Push failed:', err))
  );
  await Promise.all(promises);
}
```

**Trigger** (in lecture.controller.js):
```javascript
// After publishing announcement
const subs = await PushSubscription.find({
  userId: { $in: studentIds }
});
await notifySubscriptions(subs, {
  title: 'New Announcement',
  body: announcement.body,
  icon: '/icons/icon-192.png'
});
```

---

## 📧 Email Configuration

### Brevo Setup

1. **Create Account**: [brevo.com](https://www.brevo.com) (formerly Sendinblue)
2. **Get API Key**: Settings → API → Create new API key
3. **Set Sender**: Senders → Add sender (verify email)
4. **Update `.env`**:
   ```env
   BREVO_API_KEY=xkeysib_...
   BREVO_SENDER_EMAIL=noreply@campusflow.com
   ```

### Email Template Example

```handlebars
<!-- templates/email/welcome.hbs -->
<html>
  <body style="font-family: Arial, sans-serif;">
    <h1>Welcome to CampusFlow, {{fullName}}!</h1>
    <p>Your account has been created successfully.</p>
    <p>
      <strong>Email:</strong> {{email}}<br/>
      <strong>Role:</strong> {{role}}
    </p>
    <p>
      <a href="{{frontendUrl}}/login" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Log In Now
      </a>
    </p>
  </body>
</html>
```

### Sending Email

```javascript
// In auth.controller.js
import { sendEmail } from '@/services/email.service';

await sendEmail({
  to: newUser.email,
  subject: 'Welcome to CampusFlow',
  template: 'welcome',
  data: {
    fullName: newUser.fullName,
    email: newUser.email,
    role: newUser.role,
    frontendUrl: process.env.FRONTEND_URL
  }
});
```

---

## 📤 File Uploads

### Upload Configuration

```env
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50 MB
```

### Supported File Types
- **Assignments**: PDF, DOCX, XLSX, PPTX, images, video
- **Submissions**: Same as assignments
- **Restrictions**: No executables, scripts, or archives

### Upload Endpoint

```bash
POST /api/v1/assignments/:id/submit
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

File: submission.pdf

Response 201:
{
  "data": {
    "id": "sub123",
    "fileUrl": "/uploads/submissions/sub123.pdf",
    "submittedAt": "2024-05-08T10:35:00Z"
  }
}
```

### File Storage
- **Development**: Local `./uploads/` directory
- **Production (Render)**: Ephemeral disk (files lost on redeploy)
  - **Recommendation**: Use cloud storage (AWS S3, Google Cloud Storage, Azure Blob)

---

## 👨‍💻 Development

### Running Locally

```bash
npm run dev
# Server: http://localhost:4000
# Swagger Docs: http://localhost:4000/api-docs
```

### Testing

```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report
```

### Code Style

- **Linting**: ESLint configured
- **Formatting**: Prettier auto-format on save
- **Naming**: camelCase for functions/variables, PascalCase for models

---

## 🚀 Deployment

### Render.com Deployment

1. **Connect Repository**
   - Go to [render.com](https://render.com)
   - Create new Web Service
   - Connect GitHub repo: `CampusFlow-Backend`

2. **Configure Build**
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

3. **Set Environment Variables**
   - Add all `.env` variables in Render dashboard
   - Render will auto-deploy on push to `main`

4. **Monitor Logs**
   - Render dashboard shows deployment logs
   - Real-time logs during build/startup

### Production Checklist

- [ ] MongoDB Atlas credentials updated
- [ ] JWT secrets changed (random, long)
- [ ] HTTPS enabled (Render auto-handles)
- [ ] Email credentials verified
- [ ] VAPID keys generated & set
- [ ] CORS origins restricted to production domains
- [ ] Rate limits appropriate for expected traffic
- [ ] Error logging configured
- [ ] Database backups enabled

---

## 🐛 Troubleshooting

### Issue: "MongoDB connection failed"

**Solution:**
```bash
# Check connection string
echo $MONGODB_URI

# Verify credentials
mongosh "mongodb+srv://user:pass@cluster.mongodb.net"

# Check IP whitelist in Atlas
# (allow your server IP)
```

### Issue: "JWT secret not defined"

**Solution:**
```bash
# Verify .env exists
test -f .env && echo "Exists" || echo "Missing"

# Check variable
grep JWT_SECRET .env

# Set if missing:
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

### Issue: "Email not sending (Brevo)"

**Solution:**
```bash
# Check API key
grep BREVO_API_KEY .env

# Test Brevo connection:
curl -X GET https://api.brevo.com/v3/account \
  -H "api-key: $BREVO_API_KEY"
```

### Issue: "Web Push not delivering"

**Solution:**
```bash
# Verify VAPID keys
npm run push:keys

# Check subscription endpoint is valid (public URL)
# Ensure service worker is registered on client

# Check Web Push logs:
grep "web-push" server-logs/error.log
```

### Issue: "Rate limiting too strict"

**Solution:**
```env
# Increase limits in .env
RATE_LIMIT_WINDOW_MS=1800000        # 30 minutes
RATE_LIMIT_MAX_REQUESTS=300         # Requests
```

---

## 📄 License

MIT License – See LICENSE.md

---

**Last Updated**: May 8, 2026  
**Maintained by**: CampusFlow Team  
**Support**: For issues, open a GitHub issue or contact team
