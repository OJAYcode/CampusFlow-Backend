const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "UniTrack Attendance System API",
      version: "1.0.0",
      description:
        "Comprehensive API for managing university attendance with geolocation verification, real-time monitoring, and automated reporting.",
      contact: {
        name: "UniTrack Support",
        email: "support@unitrack.edu",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
      schemas: {
        // ─── AUTH ────────────────────────────────────────────────────────────
        RegisterTeacherRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              example: "Jane Smith",
              minLength: 2,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "jane@university.edu",
            },
            password: {
              type: "string",
              minLength: 8,
              example: "securePass123",
            },
            role: {
              type: "string",
              enum: ["teacher", "admin"],
              example: "teacher",
            },
          },
        },
        VerifyRegistrationRequest: {
          type: "object",
          required: ["registrationToken", "otp"],
          properties: {
            registrationToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1...",
            },
            otp: {
              type: "string",
              minLength: 6,
              maxLength: 6,
              example: "123456",
            },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "jane@university.edu",
            },
            password: { type: "string", example: "securePass123" },
          },
        },
        RequestOTPRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              example: "jane@university.edu",
            },
          },
        },
        VerifyEmailRequest: {
          type: "object",
          required: ["verificationToken", "otp"],
          properties: {
            verificationToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1...",
            },
            otp: {
              type: "string",
              minLength: 6,
              maxLength: 6,
              example: "123456",
            },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["current_password", "new_password"],
          properties: {
            current_password: { type: "string", example: "oldPass123" },
            new_password: {
              type: "string",
              minLength: 8,
              example: "newPass456",
            },
          },
        },

        // ─── COURSE ─────────────────────────────────────────────────────────
        CreateCourseRequest: {
          type: "object",
          required: ["course_code", "title", "level"],
          properties: {
            course_code: {
              type: "string",
              example: "CS301",
              minLength: 2,
              maxLength: 20,
            },
            title: {
              type: "string",
              example: "Software Engineering",
              minLength: 3,
              maxLength: 200,
            },
            level: {
              type: "integer",
              enum: [100, 200, 300, 400, 500, 600],
              example: 300,
            },
            lecturer_id: {
              type: "string",
              example: "64a1b2c3d4e5f6789abc0123",
              description: "Required when admin creates course",
            },
          },
        },
        UpdateCourseRequest: {
          type: "object",
          properties: {
            course_code: {
              type: "string",
              example: "CS302",
              minLength: 2,
              maxLength: 20,
            },
            title: {
              type: "string",
              example: "Advanced Software Engineering",
              minLength: 3,
              maxLength: 200,
            },
            level: {
              type: "integer",
              enum: [100, 200, 300, 400, 500, 600],
              example: 300,
            },
            lecturer_id: {
              type: "string",
              example: "64a1b2c3d4e5f6789abc0123",
              description: "Admin only: reassign course to another lecturer",
            },
          },
        },
        Course: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64a1b2c3d4e5f6789abc0123" },
            course_code: { type: "string", example: "CS301" },
            title: { type: "string", example: "Software Engineering" },
            level: { type: "integer", example: 300 },
            teacher_id: {
              type: "object",
              properties: {
                _id: { type: "string" },
                name: { type: "string" },
                email: { type: "string" },
              },
            },
            student_count: { type: "integer", example: 45 },
            active_sessions_count: { type: "integer", example: 1 },
            has_active_session: { type: "boolean", example: true },
            active_sessions: { type: "array", items: { type: "object" } },
            created_at: { type: "string", format: "date-time" },
          },
        },

        // ─── STUDENT ─────────────────────────────────────────────────────────
        AddStudentRequest: {
          type: "object",
          required: ["matric_no", "name", "email", "level"],
          properties: {
            matric_no: { type: "string", example: "CSC/2021/001" },
            name: {
              type: "string",
              example: "Alice Johnson",
              minLength: 2,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "alice@student.edu",
            },
            phone: { type: "string", example: "08011223344" },
            level: {
              type: "integer",
              enum: [100, 200, 300, 400, 500, 600],
              example: 300,
            },
          },
        },
        BulkAddStudentsRequest: {
          type: "object",
          required: ["students"],
          properties: {
            students: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: {
                type: "object",
                required: ["matric_no", "name", "email", "level"],
                properties: {
                  matric_no: { type: "string", example: "CSC/2021/001" },
                  name: { type: "string", example: "Alice Johnson" },
                  email: {
                    type: "string",
                    format: "email",
                    example: "alice@student.edu",
                  },
                  phone: { type: "string", example: "08011223344" },
                  level: {
                    type: "integer",
                    enum: [100, 200, 300, 400, 500, 600],
                    example: 300,
                  },
                },
              },
            },
          },
        },
        BulkRemoveStudentsRequest: {
          type: "object",
          required: ["student_ids"],
          properties: {
            student_ids: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: { type: "string", example: "64a1b2c3d4e5f6789abc0123" },
            },
          },
        },

        // ─── SESSION ─────────────────────────────────────────────────────────
        StartSessionRequest: {
          type: "object",
          required: ["lat", "lng"],
          properties: {
            lat: { type: "number", minimum: -90, maximum: 90, example: 6.5244 },
            lng: {
              type: "number",
              minimum: -180,
              maximum: 180,
              example: 3.3792,
            },
            radius_m: {
              type: "integer",
              minimum: 10,
              maximum: 10000,
              example: 100,
              description: "Allowed geofence radius in meters (default: 100)",
            },
            duration_minutes: {
              type: "integer",
              minimum: 5,
              maximum: 480,
              example: 60,
              description: "Session duration in minutes (default: 60)",
            },
          },
        },

        // ─── ATTENDANCE ──────────────────────────────────────────────────────
        SubmitAttendanceRequest: {
          type: "object",
          required: ["matric_no", "session_code", "lat", "lng"],
          properties: {
            matric_no: { type: "string", example: "CSC/2021/001" },
            session_code: {
              type: "string",
              minLength: 4,
              maxLength: 4,
              example: "4821",
              description: "4-digit session code provided by lecturer",
            },
            lat: { type: "number", minimum: -90, maximum: 90, example: 6.5244 },
            lng: {
              type: "number",
              minimum: -180,
              maximum: 180,
              example: 3.3792,
            },
            accuracy: {
              type: "number",
              minimum: 0,
              example: 10,
              description: "GPS accuracy in meters",
            },
            level: {
              type: "integer",
              enum: [100, 200, 300, 400, 500, 600],
              example: 300,
            },
            device_info: {
              type: "object",
              description:
                "Device information for fingerprinting. Supports FingerprintJS fields.",
              properties: {
                platform: { type: "string", example: "Android" },
                browser: { type: "string", example: "Chrome" },
                screen_resolution: { type: "string", example: "1080x1920" },
                timezone: { type: "string", example: "Africa/Lagos" },
                user_agent: { type: "string" },
                language: { type: "string", example: "en-US" },
                device_fingerprint: { type: "string" },
                os: { type: "string", example: "Android 13" },
                device_type: { type: "string", example: "mobile" },
                visitorId: {
                  type: "string",
                  description: "FingerprintJS visitorId",
                },
                confidence: {
                  type: "object",
                  properties: {
                    score: {
                      type: "number",
                      minimum: 0,
                      maximum: 1,
                      example: 0.995,
                    },
                    comment: { type: "string" },
                  },
                },
                components: {
                  type: "object",
                  description: "FingerprintJS browser components",
                },
                version: {
                  type: "string",
                  description: "FingerprintJS agent version",
                },
                timestamp: { type: "string", format: "date-time" },
              },
            },
          },
        },
        ManualAttendanceRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: {
              type: "string",
              enum: ["present", "absent"],
              example: "present",
            },
            reason: { type: "string", example: "Medical excuse submitted" },
          },
        },

        // ─── STUDENT SHARING ─────────────────────────────────────────────────
        StudentShareRequestBody: {
          type: "object",
          required: [
            "target_teacher_id",
            "target_course_id",
            "my_course_id",
            "student_ids",
          ],
          properties: {
            target_teacher_id: {
              type: "string",
              example: "64a1b2c3d4e5f6789abc0123",
            },
            target_course_id: {
              type: "string",
              example: "64a1b2c3d4e5f6789abc0124",
            },
            my_course_id: {
              type: "string",
              example: "64a1b2c3d4e5f6789abc0125",
            },
            student_ids: {
              type: "array",
              minItems: 1,
              items: { type: "string", example: "64a1b2c3d4e5f6789abc0126" },
            },
            message: {
              type: "string",
              maxLength: 500,
              example:
                "Please share these students for my parallel course section.",
            },
          },
        },
        RespondShareRequest: {
          type: "object",
          required: ["action"],
          properties: {
            action: {
              type: "string",
              enum: ["approve", "reject"],
              example: "approve",
            },
            response_message: {
              type: "string",
              maxLength: 500,
              example: "Happy to share these students.",
            },
          },
        },

        // ─── ADMIN ───────────────────────────────────────────────────────────
        CreateTeacherByAdminRequest: {
          type: "object",
          required: ["name", "email"],
          properties: {
            name: {
              type: "string",
              example: "Dr. John Doe",
              minLength: 2,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "john@university.edu",
            },
            role: {
              type: "string",
              enum: ["teacher", "admin"],
              example: "teacher",
            },
            sendWelcomeEmail: { type: "boolean", example: true },
          },
        },
        UpdateTeacherRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "Dr. John Updated",
              minLength: 2,
              maxLength: 100,
            },
            email: {
              type: "string",
              format: "email",
              example: "john.updated@university.edu",
            },
            role: { type: "string", enum: ["teacher", "admin"] },
          },
        },
        CreateAdminRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Super Admin" },
            email: {
              type: "string",
              format: "email",
              example: "admin@unitrack.edu",
            },
            password: { type: "string", minLength: 8, example: "adminPass123" },
          },
        },

        // ─── FAQ ─────────────────────────────────────────────────────────────
        CreateFAQRequest: {
          type: "object",
          required: ["question", "answer", "category"],
          properties: {
            question: {
              type: "string",
              minLength: 10,
              maxLength: 500,
              example: "How do I submit attendance?",
            },
            answer: {
              type: "string",
              minLength: 20,
              maxLength: 2000,
              example:
                "Open the app, enter the 4-digit session code provided by your lecturer, allow location access, and confirm your submission.",
            },
            category: {
              type: "string",
              enum: [
                "general",
                "security",
                "technical",
                "attendance",
                "reports",
                "support",
              ],
              example: "attendance",
            },
            display_order: { type: "integer", minimum: 0, example: 1 },
            tags: {
              type: "array",
              items: { type: "string" },
              example: ["attendance", "submission", "QR"],
            },
          },
        },

        // ─── SUPPORT ─────────────────────────────────────────────────────────
        SupportContactRequest: {
          type: "object",
          required: [
            "name",
            "email",
            "user_type",
            "subject",
            "category",
            "priority",
            "message",
          ],
          properties: {
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              example: "Alice Johnson",
            },
            email: {
              type: "string",
              format: "email",
              example: "alice@student.edu",
            },
            user_type: {
              type: "string",
              enum: ["student", "teacher", "admin", "other"],
              example: "student",
            },
            subject: {
              type: "string",
              minLength: 5,
              maxLength: 200,
              example: "Unable to submit attendance",
            },
            category: {
              type: "string",
              enum: ["technical", "attendance", "account", "general", "urgent"],
              example: "attendance",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              example: "medium",
            },
            message: {
              type: "string",
              minLength: 20,
              maxLength: 2000,
              example:
                "I am getting a location error even though I am inside the classroom. My GPS is enabled.",
            },
            phone: {
              type: "string",
              minLength: 10,
              maxLength: 15,
              example: "08011223344",
            },
            matric_no: { type: "string", example: "CSC/2021/001" },
            course_info: {
              type: "object",
              properties: {
                course_code: { type: "string", example: "CS301" },
                session_id: { type: "string", example: "64a1..." },
              },
            },
            error_details: {
              type: "object",
              properties: {
                error_code: { type: "string", example: "500" },
                error_message: {
                  type: "string",
                  example: "Internal Server Error",
                },
                timestamp: { type: "string", format: "date-time" },
              },
            },
            browser_info: {
              type: "object",
              properties: {
                browser: { type: "string", example: "Chrome" },
                version: { type: "string", example: "120.0" },
                os: { type: "string", example: "Android 13" },
              },
            },
          },
        },

        // ─── REUSABLE ────────────────────────────────────────────────────────
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Error message" },
            details: { type: "array", items: { type: "string" } },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        PaginationResponse: {
          type: "object",
          properties: {
            currentPage: { type: "integer", example: 1 },
            totalPages: { type: "integer", example: 5 },
            hasNext: { type: "boolean", example: true },
            hasPrev: { type: "boolean", example: false },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication & account management" },
      { name: "Courses", description: "Course creation and management" },
      { name: "Students", description: "Student enrollment within courses" },
      { name: "Sessions", description: "Attendance session lifecycle" },
      { name: "Attendance", description: "Attendance submission and records" },
      { name: "Admin", description: "Administrator-only operations" },
      {
        name: "Student Sharing",
        description: "Teacher-to-teacher student sharing workflow",
      },
      { name: "Support", description: "Help desk and support tickets" },
      { name: "FAQ", description: "Frequently asked questions" },
      { name: "Health", description: "System health checks" },
    ],
    paths: {
      // ═══════════════ HEALTH ═══════════════════════════════════════════════
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Server health check",
          description: "Returns server status, environment, and version.",
          responses: {
            200: {
              description: "Server is healthy",
              content: {
                "application/json": {
                  example: {
                    status: "OK",
                    timestamp: "2026-03-07T10:00:00.000Z",
                    environment: "production",
                    version: "1.0.0",
                  },
                },
              },
            },
          },
        },
      },

      // ═══════════════ AUTH ═════════════════════════════════════════════════
      "/api/auth/register_teacher": {
        post: {
          tags: ["Auth"],
          summary: "Register a new teacher",
          description:
            "Creates a new teacher account and sends a 6-digit OTP to the provided email for verification. A `registrationToken` is returned to be used in the `/verify_registration` step.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterTeacherRequest" },
              },
            },
          },
          responses: {
            200: {
              description:
                "OTP sent. Returns `registrationToken` for next step.",
              content: {
                "application/json": {
                  example: {
                    message:
                      "OTP sent to your email. Please verify to complete registration.",
                    registrationToken: "eyJhbGci...",
                  },
                },
              },
            },
            400: {
              description: "Validation error or email already registered",
            },
            503: { description: "Email service unavailable" },
          },
        },
      },
      "/api/auth/verify_registration": {
        post: {
          tags: ["Auth"],
          summary: "Verify OTP and complete registration",
          description:
            "Validates the OTP and `registrationToken`. On success, the teacher is fully registered and a JWT access token is returned.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/VerifyRegistrationRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description: "Registration completed. Returns JWT token.",
              content: {
                "application/json": {
                  example: {
                    message: "Registration completed successfully",
                    token: "eyJhbGci...",
                    teacher: {
                      _id: "64a...",
                      name: "Jane Smith",
                      email: "jane@university.edu",
                      role: "teacher",
                    },
                  },
                },
              },
            },
            400: { description: "Invalid or expired OTP" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login (teachers and admins)",
          description:
            "Authenticates a teacher or admin. Returns a JWT token valid for 24 hours. If email is not verified, a new OTP is sent and a `verificationToken` is returned instead.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  example: {
                    message: "Login successful",
                    token: "eyJhbGci...",
                    user: {
                      _id: "64a...",
                      name: "Jane Smith",
                      email: "jane@university.edu",
                      role: "teacher",
                    },
                    userType: "teacher",
                  },
                },
              },
            },
            401: { description: "Invalid credentials" },
            403: {
              description:
                "Email not verified — OTP sent, `verificationToken` returned",
            },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout",
          security: [{ bearerAuth: [] }],
          description:
            "Logs the user out. In a JWT system, token removal is client-side. This endpoint logs the logout event.",
          responses: {
            200: { description: "Logout successful" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/request_verification_code": {
        post: {
          tags: ["Auth"],
          summary: "Request a new email verification code",
          description:
            "Re-sends an OTP for unverified accounts. Rate limited to 1 request per minute.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RequestOTPRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "New OTP sent. Returns new `verificationToken`.",
            },
            404: { description: "User not found" },
          },
        },
      },
      "/api/auth/verify_email": {
        post: {
          tags: ["Auth"],
          summary: "Verify email with OTP",
          description:
            "Verifies a teacher email using the OTP and `verificationToken`. Sends a welcome email on success.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
              },
            },
          },
          responses: {
            200: { description: "Email verified. Returns JWT token." },
            400: { description: "Invalid or expired OTP" },
          },
        },
      },
      "/api/auth/request_otp": {
        post: {
          tags: ["Auth"],
          summary: "Request OTP for password reset",
          description:
            "Sends a password-reset OTP to the provided email. Rate limited to 1 request per minute.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RequestOTPRequest" },
              },
            },
          },
          responses: {
            200: { description: "OTP sent. Returns a `resetToken`." },
            404: { description: "User not found" },
          },
        },
      },
      "/api/auth/verify_otp": {
        post: {
          tags: ["Auth"],
          summary: "Verify OTP and reset password",
          description:
            "Validates the OTP and `resetToken` and resets the password to the new one provided.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["resetToken", "otp", "new_password"],
                  properties: {
                    resetToken: { type: "string", example: "eyJhbGci..." },
                    otp: { type: "string", example: "654321" },
                    new_password: {
                      type: "string",
                      minLength: 8,
                      example: "newPass456",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Password reset successful" },
            400: { description: "Invalid or expired OTP" },
          },
        },
      },
      "/api/auth/change_password": {
        post: {
          tags: ["Auth"],
          summary: "Change password (authenticated)",
          security: [{ bearerAuth: [] }],
          description:
            "Changes the password for the currently authenticated teacher or admin.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
              },
            },
          },
          responses: {
            200: { description: "Password changed successfully" },
            400: { description: "Current password incorrect" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/profile": {
        get: {
          tags: ["Auth"],
          summary: "Get current user profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "User profile returned" },
            401: { description: "Unauthorized" },
          },
        },
        patch: {
          tags: ["Auth"],
          summary: "Update current user profile",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string", example: "Dr. Jane Smith" },
                    email: {
                      type: "string",
                      format: "email",
                      example: "jane.new@university.edu",
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Profile updated" },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ═══════════════ COURSES ══════════════════════════════════════════════
      "/api/courses": {
        get: {
          tags: ["Courses"],
          summary: "Get all courses",
          security: [{ bearerAuth: [] }],
          description:
            "Returns the authenticated teacher's courses (admins see all courses). Includes student counts and active session info.",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 10 },
            },
            {
              name: "level",
              in: "query",
              description: "Filter by level",
              schema: { type: "integer", enum: [100, 200, 300, 400, 500, 600] },
            },
            {
              name: "search",
              in: "query",
              description: "Search by course code or title",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "List of courses with pagination",
              content: {
                "application/json": {
                  example: {
                    courses: [
                      {
                        _id: "64a...",
                        course_code: "CS301",
                        title: "Software Engineering",
                        level: 300,
                        student_count: 45,
                        has_active_session: true,
                      },
                    ],
                    pagination: {
                      currentPage: 1,
                      totalPages: 2,
                      totalCourses: 11,
                      hasNext: true,
                      hasPrev: false,
                    },
                  },
                },
              },
            },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Courses"],
          summary: "Create a new course",
          security: [{ bearerAuth: [] }],
          description:
            "Creates a course. Teachers create under their own account. Admins must supply `lecturer_id`. Course codes must be globally unique.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateCourseRequest" },
              },
            },
          },
          responses: {
            201: { description: "Course created successfully" },
            400: { description: "Duplicate course code or validation error" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/courses/{id}": {
        get: {
          tags: ["Courses"],
          summary: "Get course details",
          security: [{ bearerAuth: [] }],
          description:
            "Returns comprehensive course details including enrolled students, sessions, and attendance statistics.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description:
                "Course details with students, sessions, and statistics",
            },
            404: { description: "Course not found" },
          },
        },
        patch: {
          tags: ["Courses"],
          summary: "Update a course",
          security: [{ bearerAuth: [] }],
          description:
            "Updates course fields. Admins can additionally reassign the course to a different lecturer via `lecturer_id`.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateCourseRequest" },
              },
            },
          },
          responses: {
            200: { description: "Course updated" },
            404: { description: "Course not found" },
          },
        },
        delete: {
          tags: ["Courses"],
          summary: "Delete a course",
          security: [{ bearerAuth: [] }],
          description:
            "Deletes the course along with all its sessions and attendance records.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Course deleted" },
            404: { description: "Course not found" },
          },
        },
      },

      // ═══════════════ STUDENTS ═════════════════════════════════════════════
      "/api/courses/{courseId}/students": {
        get: {
          tags: ["Students"],
          summary: "Get enrolled students",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            200: { description: "List of enrolled students with pagination" },
            404: { description: "Course not found" },
          },
        },
        post: {
          tags: ["Students"],
          summary: "Add a student to course",
          security: [{ bearerAuth: [] }],
          description:
            "Adds a single student. If the student (by matric number) already exists in the system, their info is updated. If already enrolled in this course, returns 400.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AddStudentRequest" },
              },
            },
          },
          responses: {
            201: { description: "Student added to course" },
            400: { description: "Student already enrolled" },
            404: { description: "Course not found" },
          },
        },
      },
      "/api/courses/{courseId}/students/bulk": {
        post: {
          tags: ["Students"],
          summary: "Bulk add students to course (up to 100)",
          security: [{ bearerAuth: [] }],
          description:
            "Processes up to 100 students in one request. Returns a summary of successful, failed, and skipped (already enrolled) entries.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BulkAddStudentsRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Bulk enrollment completed with summary report",
            },
            404: { description: "Course not found" },
          },
        },
        delete: {
          tags: ["Students"],
          summary: "Bulk remove specific students from course",
          security: [{ bearerAuth: [] }],
          description:
            "Removes up to 100 specific students by their student IDs. Also cleans their attendance records for this course.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/BulkRemoveStudentsRequest",
                },
              },
            },
          },
          responses: {
            200: { description: "Bulk removal completed with summary" },
            404: { description: "Course not found" },
          },
        },
      },
      "/api/courses/{courseId}/students/all": {
        delete: {
          tags: ["Students"],
          summary: "Remove ALL students from course",
          security: [{ bearerAuth: [] }],
          description:
            "Removes all enrolled students from the course and deletes all attendance records for this course's sessions.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "All students removed" },
            404: { description: "Course not found" },
          },
        },
      },
      "/api/courses/{courseId}/students/{studentId}": {
        delete: {
          tags: ["Students"],
          summary: "Remove a single student from course",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "studentId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Student removed" },
            404: { description: "Student or enrollment not found" },
          },
        },
      },
      "/api/courses/{courseId}/students/{studentId}/mark": {
        patch: {
          tags: ["Students"],
          summary: "Manually mark student attendance",
          security: [{ bearerAuth: [] }],
          description:
            "Allows a teacher to manually mark a student as present or absent for a specific session.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "studentId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ManualAttendanceRequest",
                },
              },
            },
          },
          responses: {
            200: { description: "Attendance marked manually" },
            404: { description: "Student or course not found" },
          },
        },
      },

      // ═══════════════ SESSIONS ═════════════════════════════════════════════
      "/api/courses/{courseId}/sessions": {
        get: {
          tags: ["Sessions"],
          summary: "Get sessions for a course",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["active", "expired", "all"],
                default: "all",
              },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            200: { description: "List of sessions with attendance stats" },
            404: { description: "Course not found" },
          },
        },
        post: {
          tags: ["Sessions"],
          summary: "Start an attendance session",
          security: [{ bearerAuth: [] }],
          description:
            "Creates a new active attendance session for the course. Only one active session per course at a time is allowed. Sends email notification to the teacher.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StartSessionRequest" },
              },
            },
          },
          responses: {
            201: {
              description: "Session started successfully",
              content: {
                "application/json": {
                  example: {
                    message: "Attendance session started successfully",
                    session: {
                      id: "64a...",
                      session_code: "4821",
                      start_time: "2026-03-07T10:00:00.000Z",
                      expiry_time: "2026-03-07T11:00:00.000Z",
                      location: { lat: 6.5244, lng: 3.3792 },
                      radius_meters: 100,
                    },
                  },
                },
              },
            },
            400: {
              description: "Active session already exists for this course",
            },
            404: { description: "Course not found" },
          },
        },
      },
      "/api/sessions/{sessionId}": {
        get: {
          tags: ["Sessions"],
          summary: "Get session details",
          security: [{ bearerAuth: [] }],
          description:
            "Returns full session details including all enrolled students with their attendance status (present/absent), statistics, and raw attendance records.",
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description:
                "Session with student attendance breakdown and statistics",
            },
            404: { description: "Session not found" },
          },
        },
      },
      "/api/sessions/{sessionId}/end": {
        patch: {
          tags: ["Sessions"],
          summary: "End session early",
          security: [{ bearerAuth: [] }],
          description:
            "Immediately expires the session before its scheduled end time.",
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Session ended" },
            400: { description: "Session already expired" },
            404: { description: "Session not found" },
          },
        },
      },
      "/api/sessions/{sessionId}/live": {
        get: {
          tags: ["Sessions"],
          summary: "Real-time attendance monitoring",
          security: [{ bearerAuth: [] }],
          description:
            "Returns recent submissions within a configurable time window. Always returns at least 10 submissions. Useful for live monitoring on a dashboard.",
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "minutes",
              in: "query",
              description: "Time window in minutes (default: 10)",
              schema: { type: "integer", default: 10 },
            },
          ],
          responses: {
            200: {
              description: "Live stats and recent submissions",
              content: {
                "application/json": {
                  example: {
                    session_info: {
                      session_code: "4821",
                      is_active: true,
                      expires_at: "2026-03-07T11:00:00.000Z",
                    },
                    live_stats: {
                      total_submissions: 32,
                      present_count: 30,
                      rejected_count: 2,
                      last_updated: "2026-03-07T10:25:00.000Z",
                    },
                  },
                },
              },
            },
            404: { description: "Session not found" },
          },
        },
      },
      "/api/sessions/{sessionId}/report.csv": {
        get: {
          tags: ["Sessions"],
          summary: "Download session attendance CSV",
          security: [{ bearerAuth: [] }],
          description:
            "Downloads or emails the attendance CSV for a single session.",
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "email",
              in: "query",
              description:
                "Set to `true` to send via email instead of download",
              schema: { type: "string", enum: ["true", "false"] },
            },
          ],
          responses: {
            200: { description: "CSV file download or email confirmation" },
            404: { description: "Session not found" },
          },
        },
      },
      "/api/sessions/{sessionId}/report.pdf": {
        get: {
          tags: ["Sessions"],
          summary: "Download session attendance PDF",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "email",
              in: "query",
              schema: { type: "string", enum: ["true", "false"] },
            },
          ],
          responses: {
            200: { description: "PDF file download or email confirmation" },
            404: { description: "Session not found" },
          },
        },
      },

      // ═══════════════ ATTENDANCE ═══════════════════════════════════════════
      "/api/attendance/submit": {
        post: {
          tags: ["Attendance"],
          summary: "Submit attendance (public — no auth required)",
          description:
            "Public endpoint for students to submit attendance. Performs extensive validation: session active check, enrollment verification, level matching, device uniqueness, and geolocation (Haversine formula). Rate limited to 3 requests per minute.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SubmitAttendanceRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Attendance submitted successfully",
              content: {
                "application/json": {
                  example: {
                    success: true,
                    message: "Attendance submitted successfully",
                    record: {
                      student_name: "Alice Johnson",
                      matric_no: "CSC/2021/001",
                      course: "Software Engineering",
                      session_code: "4821",
                      status: "present",
                      submitted_at: "2026-03-07T10:15:00.000Z",
                      receipt: "a3f9...",
                    },
                  },
                },
              },
            },
            400: {
              description:
                "Already submitted, device already used, level mismatch, or session expired",
            },
            403: { description: "Student not enrolled in this course" },
            404: { description: "Invalid session code, student not found" },
          },
        },
      },
      "/api/attendance/session/{sessionId}": {
        get: {
          tags: ["Attendance"],
          summary: "Get attendance records for a session",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "sessionId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["present", "absent", "rejected", "manual_present"],
              },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50 },
            },
          ],
          responses: {
            200: { description: "Attendance records for the session" },
            404: { description: "Session not found" },
          },
        },
      },
      "/api/attendance/course/{courseId}/report.csv": {
        get: {
          tags: ["Attendance"],
          summary: "Download comprehensive course attendance CSV",
          security: [{ bearerAuth: [] }],
          description:
            "Generates a comprehensive CSV with: course info, summary stats, risk analysis, students below 75%, session overview, and all student summaries.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "email",
              in: "query",
              description: "Send via email instead of download",
              schema: { type: "string", enum: ["true", "false"] },
            },
          ],
          responses: {
            200: { description: "CSV download or email confirmation" },
            404: { description: "Course not found" },
          },
        },
      },
      "/api/attendance/course/{courseId}/report.pdf": {
        get: {
          tags: ["Attendance"],
          summary: "Download comprehensive course attendance PDF",
          security: [{ bearerAuth: [] }],
          description:
            "Generates a formatted PDF report with risk analysis, session breakdown, and student summaries.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "email",
              in: "query",
              schema: { type: "string", enum: ["true", "false"] },
            },
          ],
          responses: {
            200: { description: "PDF download or email confirmation" },
            404: { description: "Course not found" },
          },
        },
      },
      "/api/attendance/course/{courseId}/stats": {
        get: {
          tags: ["Attendance"],
          summary: "Get course attendance statistics",
          security: [{ bearerAuth: [] }],
          description:
            "Returns detailed attendance statistics for a course including risk analysis, per-student rates, and per-session breakdowns.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Comprehensive attendance statistics" },
            404: { description: "Course not found" },
          },
        },
      },

      // ═══════════════ ADMIN ════════════════════════════════════════════════
      "/api/admin/stats": {
        get: {
          tags: ["Admin"],
          summary: "Get system statistics",
          security: [{ bearerAuth: [] }],
          description:
            "Returns comprehensive system metrics: total counts, growth trends (24h/7d/30d/90d), enrollment stats, attendance breakdown, most active teachers, risk indicators, and recent audit activity.",
          responses: {
            200: { description: "System statistics and trends" },
            403: { description: "Admin access required" },
          },
        },
      },
      "/api/admin/health": {
        get: {
          tags: ["Admin"],
          summary: "System health check (admin)",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "System health and database status" },
            403: { description: "Admin access required" },
          },
        },
      },
      "/api/admin/teachers": {
        get: {
          tags: ["Admin"],
          summary: "Get all teachers",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "search",
              in: "query",
              description: "Search by name or email",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            200: { description: "List of all teachers" },
            403: { description: "Admin access required" },
          },
        },
        post: {
          tags: ["Admin"],
          summary: "Create teacher account",
          security: [{ bearerAuth: [] }],
          description:
            "Admin creates a teacher account. A random password is generated and optionally emailed to the teacher.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateTeacherByAdminRequest",
                },
              },
            },
          },
          responses: {
            201: {
              description:
                "Teacher created. Returns teacher info and temporary password.",
            },
            409: { description: "Email already in use" },
          },
        },
      },
      "/api/admin/teachers/{id}": {
        get: {
          tags: ["Admin"],
          summary: "Get teacher details",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Teacher details" },
            404: { description: "Teacher not found" },
          },
        },
        patch: {
          tags: ["Admin"],
          summary: "Update teacher",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateTeacherRequest" },
              },
            },
          },
          responses: {
            200: { description: "Teacher updated" },
            404: { description: "Teacher not found" },
          },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete teacher",
          security: [{ bearerAuth: [] }],
          description:
            "Deletes the teacher and all their courses, sessions, and attendance records.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Teacher deleted" },
            404: { description: "Teacher not found" },
          },
        },
      },
      "/api/admin/admins": {
        get: {
          tags: ["Admin"],
          summary: "Get all admins",
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: "List of all admin accounts" },
            403: { description: "Admin access required" },
          },
        },
        post: {
          tags: ["Admin"],
          summary: "Create admin account",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateAdminRequest" },
              },
            },
          },
          responses: {
            201: { description: "Admin account created" },
            409: { description: "Email already in use" },
          },
        },
      },
      "/api/admin/admins/{id}": {
        patch: {
          tags: ["Admin"],
          summary: "Update admin account",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateTeacherRequest" },
              },
            },
          },
          responses: {
            200: { description: "Admin updated" },
            404: { description: "Admin not found" },
          },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete admin account",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Admin deleted" },
            404: { description: "Admin not found" },
          },
        },
      },
      "/api/admin/audit-logs": {
        get: {
          tags: ["Admin"],
          summary: "Get system audit logs",
          security: [{ bearerAuth: [] }],
          description:
            "Returns a filterable/pageable log of all system actions.",
          parameters: [
            {
              name: "action",
              in: "query",
              description: "Filter by action type (e.g. session_started)",
              schema: { type: "string" },
            },
            { name: "teacher_id", in: "query", schema: { type: "string" } },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            200: { description: "Paginated audit log entries" },
            403: { description: "Admin access required" },
          },
        },
      },
      "/api/admin/course/{courseId}/report.csv": {
        get: {
          tags: ["Admin"],
          summary: "Download course attendance CSV (admin access)",
          security: [{ bearerAuth: [] }],
          description:
            "Same comprehensive CSV report as the teacher endpoint but with admin-level access to any course.",
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "email",
              in: "query",
              schema: { type: "string", enum: ["true", "false"] },
            },
          ],
          responses: {
            200: { description: "CSV download or email confirmation" },
            403: { description: "Admin access required" },
            404: { description: "Course not found" },
          },
        },
      },
      "/api/admin/course/{courseId}/report.pdf": {
        get: {
          tags: ["Admin"],
          summary: "Download course attendance PDF (admin access)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "email",
              in: "query",
              schema: { type: "string", enum: ["true", "false"] },
            },
          ],
          responses: {
            200: { description: "PDF download or email confirmation" },
            403: { description: "Admin access required" },
            404: { description: "Course not found" },
          },
        },
      },

      // ═══════════════ STUDENT SHARING ══════════════════════════════════════
      "/api/student-sharing/teachers": {
        get: {
          tags: ["Student Sharing"],
          summary: "Get all available teachers (excluding self)",
          security: [{ bearerAuth: [] }],
          description:
            "Returns list of teachers you can send sharing requests to.",
          responses: {
            200: { description: "List of teachers" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/student-sharing/my-courses": {
        get: {
          tags: ["Student Sharing"],
          summary: "Get courses with student counts",
          security: [{ bearerAuth: [] }],
          description:
            "Returns your courses or another teacher's courses (via `teacher_id` query param) with student counts. Used to browse courses before sending a share request.",
          parameters: [
            {
              name: "teacher_id",
              in: "query",
              description: "If provided, return that teacher's courses",
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Courses with student counts" },
          },
        },
      },
      "/api/student-sharing/teachers/{teacherId}/courses/{courseId}/students": {
        get: {
          tags: ["Student Sharing"],
          summary: "Get students from a specific teacher's course",
          security: [{ bearerAuth: [] }],
          description:
            "Returns the student list for a target teacher's course so you can select which students to request.",
          parameters: [
            {
              name: "teacherId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "courseId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Student list for that course" },
            404: { description: "Course or teacher not found" },
          },
        },
      },
      "/api/student-sharing/request": {
        post: {
          tags: ["Student Sharing"],
          summary: "Send a student sharing request",
          security: [{ bearerAuth: [] }],
          description:
            "Sends a request to another teacher to share selected students. The target teacher receives an email notification. Request expires in 7 days.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/StudentShareRequestBody",
                },
              },
            },
          },
          responses: {
            201: {
              description:
                "Sharing request created and notification email sent",
            },
            400: {
              description:
                "Pending request already exists or students not in target course",
            },
            404: { description: "Course or teacher not found" },
          },
        },
      },
      "/api/student-sharing/incoming": {
        get: {
          tags: ["Student Sharing"],
          summary: "Get incoming share requests",
          security: [{ bearerAuth: [] }],
          description:
            "Returns sharing requests sent TO the authenticated teacher.",
          parameters: [
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["pending", "approved", "rejected", "all"],
                default: "pending",
              },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: { 200: { description: "Incoming share requests" } },
        },
      },
      "/api/student-sharing/outgoing": {
        get: {
          tags: ["Student Sharing"],
          summary: "Get outgoing share requests",
          security: [{ bearerAuth: [] }],
          description:
            "Returns sharing requests made BY the authenticated teacher.",
          parameters: [
            {
              name: "status",
              in: "query",
              schema: {
                type: "string",
                enum: ["pending", "approved", "rejected", "cancelled", "all"],
                default: "all",
              },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: { 200: { description: "Outgoing share requests" } },
        },
      },
      "/api/student-sharing/{requestId}/respond": {
        patch: {
          tags: ["Student Sharing"],
          summary: "Approve or reject a sharing request",
          security: [{ bearerAuth: [] }],
          description:
            "The target teacher approves or rejects en incoming request. If approved, students are automatically enrolled in the requester's course. The requester receives an email notification.",
          parameters: [
            {
              name: "requestId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespondShareRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Request processed. Students enrolled if approved.",
            },
            404: { description: "Request not found or already processed" },
          },
        },
      },
      "/api/student-sharing/{requestId}/cancel": {
        patch: {
          tags: ["Student Sharing"],
          summary: "Cancel an outgoing share request",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "requestId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Request cancelled" },
            404: { description: "Request not found or cannot be cancelled" },
          },
        },
      },

      // ═══════════════ SUPPORT ══════════════════════════════════════════════
      "/api/support/contact": {
        post: {
          tags: ["Support"],
          summary: "Submit a support request",
          description:
            "Submits a support ticket. All active admins are notified via email. The submitter receives a confirmation email with a unique ticket ID. Rate limited to 2 requests per 5 minutes.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SupportContactRequest" },
              },
            },
          },
          responses: {
            200: {
              description: "Support request submitted",
              content: {
                "application/json": {
                  example: {
                    success: true,
                    ticketId: "TK175645301628642VM",
                    data: {
                      category: "attendance",
                      priority: "medium",
                      admins_notified: 2,
                      expected_response: "within 1-2 business days",
                    },
                  },
                },
              },
            },
            400: { description: "Validation error" },
            429: { description: "Rate limit exceeded" },
          },
        },
      },
      "/api/support/info": {
        get: {
          tags: ["Support"],
          summary: "Get support categories, priorities, and guidelines",
          responses: {
            200: { description: "Support metadata and guidelines" },
          },
        },
      },
      "/api/support/faq": {
        get: {
          tags: ["Support"],
          summary: "Get built-in FAQ",
          description:
            "Returns a static FAQ list grouped by Authentication, Attendance, and Technical categories.",
          responses: {
            200: { description: "FAQ content" },
          },
        },
      },
      "/api/support/health": {
        get: {
          tags: ["Support"],
          summary: "Support system health check",
          responses: {
            200: { description: "Support system is operational" },
          },
        },
      },

      // ═══════════════ FAQ (DB-backed) ══════════════════════════════════════
      "/api/faq": {
        get: {
          tags: ["FAQ"],
          summary: "Get all FAQs (public)",
          description:
            "Returns active FAQs from the database. Supports category filter, full-text search, and pagination.",
          parameters: [
            {
              name: "category",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "general",
                  "security",
                  "technical",
                  "attendance",
                  "reports",
                  "support",
                ],
              },
            },
            {
              name: "search",
              in: "query",
              description: "Full-text search across question, answer, and tags",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20 },
            },
          ],
          responses: {
            200: { description: "Paginated list of FAQs" },
          },
        },
        post: {
          tags: ["FAQ"],
          summary: "Create a new FAQ (Admin only)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateFAQRequest" },
              },
            },
          },
          responses: {
            201: { description: "FAQ created" },
            403: { description: "Admin access required" },
          },
        },
      },
      "/api/faq/categories": {
        get: {
          tags: ["FAQ"],
          summary: "Get FAQ categories with counts",
          description:
            "Returns each active FAQ category along with the number of questions it contains.",
          responses: {
            200: { description: "FAQ categories with question counts" },
          },
        },
      },
      "/api/faq/{id}": {
        get: {
          tags: ["FAQ"],
          summary: "Get a single FAQ",
          description: "Returns a single FAQ and increments its `view_count`.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "FAQ item" },
            404: { description: "FAQ not found or inactive" },
          },
        },
        put: {
          tags: ["FAQ"],
          summary: "Update a FAQ (Admin only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateFAQRequest" },
              },
            },
          },
          responses: {
            200: { description: "FAQ updated" },
            404: { description: "FAQ not found" },
          },
        },
        delete: {
          tags: ["FAQ"],
          summary: "Soft-delete a FAQ (Admin only)",
          security: [{ bearerAuth: [] }],
          description:
            "Sets `is_active = false` (soft delete). The FAQ will no longer appear in public listings.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "FAQ deactivated" },
            404: { description: "FAQ not found" },
          },
        },
      },
    },
  },
  apis: [], // All paths are defined inline above
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
