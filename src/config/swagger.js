const json = (schema) => ({
  content: {
    "application/json": { schema },
  },
});

const bearer = [{ bearerAuth: [] }];

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "CampusFlow Smart Attendance and E-Learning API",
    version: "1.0.0",
    description:
      "Modular university backend for attendance, enrollments, materials, assignments, assessments, communication, and reporting.",
  },
  servers: [{ url: "/api/v1", description: "Version 1 API" }],
  tags: [
    { name: "Auth" },
    { name: "Students" },
    { name: "Lecturers" },
    { name: "Attendance" },
    { name: "Admin" },
    { name: "Assignments" },
    { name: "Assessments" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation successful" },
          data: { type: "object", additionalProperties: true },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "user@campusflow.edu.ng" },
          password: { type: "string", minLength: 8, example: "Password123" },
        },
      },
      StudentRegisterRequest: {
        type: "object",
        required: ["matricNumber", "email", "password"],
        properties: {
          matricNumber: { type: "string", example: "UT/CSC/24/001" },
          email: { type: "string", format: "email", example: "ada@campusflow.edu.ng" },
          password: { type: "string", minLength: 8, example: "Password123" },
          phone: { type: "string", example: "+2348000000000" },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: { type: "string" },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["resetToken", "newPassword"],
        properties: {
          resetToken: { type: "string" },
          newPassword: { type: "string", minLength: 8, example: "NewPassword123" },
        },
      },
      AttendanceSubmitRequest: {
        type: "object",
        required: ["sessionId", "sessionCode", "latitude", "longitude"],
        properties: {
          sessionId: { type: "string" },
          sessionCode: { type: "string", example: "4821" },
          latitude: { type: "number", example: 6.5244 },
          longitude: { type: "number", example: 3.3792 },
          accuracy: { type: "number", example: 10 },
          deviceFingerprint: { type: "string", example: "a6d73e8d9e5e" },
          faceImageUrl: { type: "string", example: "https://cdn.example.com/selfie.jpg" },
        },
      },
      AssessmentSubmitRequest: {
        type: "object",
        required: ["answers"],
        properties: {
          answers: {
            type: "array",
            items: {
              type: "object",
              required: ["questionId", "answer"],
              properties: {
                questionId: { type: "string" },
                answer: {
                  oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
                },
              },
            },
          },
        },
      },
      ElectiveSelectionRequest: {
        type: "object",
        required: ["courseIds"],
        properties: {
          courseIds: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      ApprovalRequest: {
        type: "object",
        required: ["approvalStatus"],
        properties: {
          approvalStatus: { type: "string", enum: ["approved", "rejected"] },
          rejectionReason: { type: "string", example: "Quota is full" },
        },
      },
    },
  },
  paths: {
    "/auth/student/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a student using seeded institutional data",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/StudentRegisterRequest" }) },
        responses: {
          201: { description: "Student registered", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
          400: { description: "Seeded student not found", ...json({ $ref: "#/components/schemas/ErrorResponse" }) },
        },
      },
    },
    "/auth/student/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in as student",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/LoginRequest" }) },
        responses: {
          200: { description: "Student login successful", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/auth/lecturer/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in as lecturer",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/LoginRequest" }) },
        responses: {
          200: { description: "Lecturer login successful", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/auth/admin/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in as admin or super admin",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/LoginRequest" }) },
        responses: {
          200: { description: "Admin login successful", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Refresh an access token",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/RefreshTokenRequest" }) },
        responses: {
          200: { description: "Token refreshed", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset link",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/ForgotPasswordRequest" }) },
        responses: {
          200: { description: "Reset flow processed", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with reset token",
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/ResetPasswordRequest" }) },
        responses: {
          200: { description: "Password reset successful", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Fetch authenticated user",
        security: bearer,
        responses: {
          200: { description: "Authenticated user", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/students/profile": {
      get: {
        tags: ["Students"],
        summary: "Get student profile",
        security: bearer,
        responses: {
          200: { description: "Profile fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/students/electives": {
      get: {
        tags: ["Students"],
        summary: "List eligible electives for the logged-in student",
        security: bearer,
        responses: {
          200: { description: "Eligible electives fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
      post: {
        tags: ["Students"],
        summary: "Request elective selections",
        security: bearer,
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/ElectiveSelectionRequest" }) },
        responses: {
          200: { description: "Elective requests submitted", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/students/enrollments": {
      get: {
        tags: ["Students"],
        summary: "List student enrollments",
        security: bearer,
        responses: {
          200: { description: "Enrollments fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/students/assignments": {
      get: {
        tags: ["Students"],
        summary: "List assignments for enrolled courses",
        security: bearer,
        responses: {
          200: { description: "Assignments fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/students/assessments": {
      get: {
        tags: ["Students"],
        summary: "List assessments for enrolled courses",
        security: bearer,
        responses: {
          200: { description: "Assessments fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/lecturers/courses": {
      get: {
        tags: ["Lecturers"],
        summary: "List lecturer-assigned courses",
        security: bearer,
        responses: {
          200: { description: "Courses fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/lecturers/attendance-sessions": {
      post: {
        tags: ["Lecturers"],
        summary: "Create an attendance session",
        security: bearer,
        requestBody: {
          required: true,
          ...json({
            type: "object",
            required: ["courseId", "startTime", "endTime", "latitude", "longitude", "radius"],
            properties: {
              courseId: { type: "string" },
              startTime: { type: "string", format: "date-time" },
              endTime: { type: "string", format: "date-time" },
              latitude: { type: "number" },
              longitude: { type: "number" },
              radius: { type: "number" },
              roomLabel: { type: "string" },
              strictMode: { type: "boolean" },
              faceVerificationEnabled: { type: "boolean" },
            },
          }),
        },
        responses: {
          201: { description: "Session created", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/attendance/sessions": {
      get: {
        tags: ["Attendance"],
        summary: "List active attendance sessions",
        security: bearer,
        responses: {
          200: { description: "Active sessions fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/attendance/submit": {
      post: {
        tags: ["Attendance"],
        summary: "Submit attendance with anti-fraud checks",
        security: bearer,
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/AttendanceSubmitRequest" }) },
        responses: {
          201: { description: "Attendance submitted", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
          409: { description: "Duplicate submission or suspicious device reuse", ...json({ $ref: "#/components/schemas/ErrorResponse" }) },
        },
      },
    },
    "/attendance/history": {
      get: {
        tags: ["Attendance"],
        summary: "Get attendance history for a student",
        security: bearer,
        responses: {
          200: { description: "Attendance history fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/assignments/{id}": {
      get: {
        tags: ["Assignments"],
        summary: "Get a single assignment",
        security: bearer,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Assignment fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/assignments/{id}/submit": {
      post: {
        tags: ["Assignments"],
        summary: "Submit assignment through shared route",
        security: bearer,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  submissionText: { type: "string" },
                  files: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Assignment submitted", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/assessments/{id}": {
      get: {
        tags: ["Assessments"],
        summary: "Get an assessment and its questions",
        security: bearer,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Assessment fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/assessments/{id}/start": {
      post: {
        tags: ["Assessments"],
        summary: "Start an assessment attempt",
        security: bearer,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: {
          201: { description: "Attempt started", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
          409: { description: "Only one attempt allowed", ...json({ $ref: "#/components/schemas/ErrorResponse" }) },
        },
      },
    },
    "/assessments/{id}/submit": {
      post: {
        tags: ["Assessments"],
        summary: "Submit assessment answers",
        security: bearer,
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/AssessmentSubmitRequest" }) },
        responses: {
          200: { description: "Assessment submitted", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/admin/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "Get admin dashboard summary",
        security: bearer,
        responses: {
          200: { description: "Dashboard fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/admin/students/seed": {
      post: {
        tags: ["Admin"],
        summary: "Seed institutional student records",
        security: bearer,
        requestBody: {
          required: true,
          ...json({
            type: "object",
            properties: {
              students: {
                type: "array",
                items: {
                  type: "object",
                  required: ["matricNumber", "fullName", "department", "level"],
                  properties: {
                    matricNumber: { type: "string" },
                    fullName: { type: "string" },
                    faculty: { type: "string" },
                    department: { type: "string" },
                    level: { type: "integer" },
                    email: { type: "string", format: "email" },
                    phone: { type: "string" },
                  },
                },
              },
            },
          }),
        },
        responses: {
          201: { description: "Students seeded", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/admin/elective-requests": {
      get: {
        tags: ["Admin"],
        summary: "List elective approval requests",
        security: bearer,
        responses: {
          200: { description: "Elective requests fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/admin/elective-requests/{enrollmentId}": {
      patch: {
        tags: ["Admin"],
        summary: "Approve or reject an elective request",
        security: bearer,
        parameters: [{ in: "path", name: "enrollmentId", required: true, schema: { type: "string" } }],
        requestBody: { required: true, ...json({ $ref: "#/components/schemas/ApprovalRequest" }) },
        responses: {
          200: { description: "Request updated", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/admin/reports/courses/{courseId}/academic": {
      get: {
        tags: ["Admin"],
        summary: "Get course academic report",
        security: bearer,
        parameters: [{ in: "path", name: "courseId", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Academic report fetched", ...json({ $ref: "#/components/schemas/ApiResponse" }) },
        },
      },
    },
    "/admin/reports/courses/{courseId}/export.csv": {
      get: {
        tags: ["Admin"],
        summary: "Export course academic report as CSV",
        security: bearer,
        parameters: [{ in: "path", name: "courseId", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "CSV export generated" },
        },
      },
    },
    "/admin/reports/courses/{courseId}/export.pdf": {
      get: {
        tags: ["Admin"],
        summary: "Export course academic report as PDF",
        security: bearer,
        parameters: [{ in: "path", name: "courseId", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "PDF export generated" },
        },
      },
    },
  },
};
