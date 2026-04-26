# Smart Attendance and E-Learning API Summary

## Runtime

The active backend runs through:

- `src/app.js`
- `src/server.js`
- `src/routes/v1/**`

The legacy runtime has been removed. New development should target the modular `/api/v1` structure only.

## Architecture

- `src/controllers`: HTTP handlers
- `src/services`: business logic, access checks, enrollment logic, reporting, and attendance anti-fraud rules
- `src/models`: Mongoose domain models for auth, academic structure, attendance, and e-learning modules
- `src/routes/v1`: versioned REST route groups
- `src/validators`: `express-validator` schemas
- `src/middlewares`: auth, RBAC, validation, uploads, rate limiting, request context, and error handling
- `src/utils`: API response helpers, JWT helpers, export helpers, pagination, logging, and geolocation logic

## Implemented Domains

### Auth and Roles

- Student registration using seeded institutional records
- Student, lecturer, and admin login
- JWT access tokens
- Refresh token flow
- Forgot-password and reset-password flow
- Role-based route protection

### Academic Structure

- Faculties
- Departments
- Courses
- Course-lecturer assignments
- Seeded students
- Course enrollments with `core` and `elective` behavior
- Elective approval workflow

### Attendance

- Attendance sessions with geofence settings
- Attendance submission validation
- Session code verification
- Duplicate attendance prevention
- Device reuse detection inside a session
- Attendance reporting
- Face-verification placeholders for future identity checks

### E-Learning

- Course materials with file upload support
- Assignments and submissions
- Assessments and attempts
- Announcements
- Course messages

### Oversight and Reporting

- Admin dashboard summaries
- Attendance, enrollment, assignment, and assessment summaries
- Course academic reports
- CSV and PDF export helpers
- Audit-friendly request context and admin visibility

## Main Route Groups

- `/api/v1/auth`
- `/api/v1/admin`
- `/api/v1/students`
- `/api/v1/lecturers`
- `/api/v1/attendance`
- `/api/v1/materials`
- `/api/v1/assignments`
- `/api/v1/assessments`
- `/api/v1/communication`

## Key Business Rules

1. Students can only register when their matric number exists in `seeded_students`.
2. Seeded student data is the source of truth for faculty, department, programme, and level.
3. Core courses are auto-enrolled during student registration.
4. Electives are student-selected and remain pending until approval.
5. Only valid electives for the student's department, level, and semester should be selectable.
6. Courses support multiple lecturers through `course_lecturers`.
7. Only assigned lecturers can manage protected course content.
8. Only approved enrolled students can access course materials, assignments, assessments, messages, and attendance.
9. Attendance validates session state, session code, enrollment, geofence, duplicate submission, and suspicious device reuse.
10. The attendance design is extensible for future identity strengthening such as face verification or registered-device policy.

## Seed Scripts

- `npm run seed:academic`
- `npm run seed:students:v1`

## Test Coverage

Current automated tests cover:

- app smoke flows
- auth service flows
- enrollment service rules
- attendance anti-fraud behavior

Run with:

```bash
npm test -- --runInBand
```

## Future Face Recognition Hooks

- `attendance_sessions.faceVerificationEnabled`
- `attendance_records.faceImageUrl`
- `attendance_records.faceMatchScore`
- `attendance_records.faceVerificationStatus`
- `face_verification_logs`

These fields and collections are intentionally decoupled so a facial verification provider can be integrated later without rewriting the attendance submission flow.
