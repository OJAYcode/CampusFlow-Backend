const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs").promises;
const path = require("path");

class EmailService {
  constructor() {
    try {
      // Check if email configuration is available
      if (
        !process.env.EMAIL_HOST ||
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS
      ) {
        console.warn(
          "⚠️  Email service disabled: Missing email configuration (EMAIL_HOST, EMAIL_USER, or EMAIL_PASS)"
        );
        this.transporter = null;
      } else {
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        console.log("✅ Email service configured with host:", process.env.EMAIL_HOST);
      }

      // Register Handlebars helpers
      handlebars.registerHelper("eq", function (a, b) {
        return a === b;
      });

      handlebars.registerHelper("if_gt", function (a, b, options) {
        if (a > b) {
          return options.fn(this);
        }
        return options.inverse(this);
      });
    } catch (error) {
      console.error(
        "⚠️  Email service initialization failed (emails will be skipped):",
        error.message
      );
      this.emailEnabled = false;
      this.transporter = null;
    }
  }

  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(
        __dirname,
        "../templates/email",
        `${templateName}.hbs`
      );
      const templateSource = await fs.readFile(templatePath, "utf8");
      return handlebars.compile(templateSource);
    } catch (error) {
      console.error(
        `⚠️  Failed to load email template ${templateName} (email skipped):`,
        error.message
      );
      return null;
    }
  }

  async sendOTP(email, otp, purpose = "verification") {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - OTP email skipped for ${email}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("otp");
      if (!template) {
        console.warn(`⚠️  Template not found - OTP email skipped for ${email}`);
        return { skipped: true, reason: "Template not found" };
      }

      const expiryTime = new Date(
        Date.now() + 60 * 60 * 1000
      ).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const html = template({
        otp,
        purpose,
        expiryMinutes: 60, // Always 1 hour expiry
        expiryTime: expiryTime,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Your OTP for ${purpose}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ OTP email sent:", info.messageId);
      return info;
    } catch (error) {
      console.error("⚠️  Failed to send OTP email (skipped):", error.message);
      return { skipped: true, reason: error.message };
    }
  }

  async sendSessionNotification(
    teacherEmail,
    teacherName,
    courseTitle,
    sessionCode
  ) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Session notification skipped for ${teacherEmail}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("session-notification");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Session notification skipped for ${teacherEmail}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      const html = template({
        teacherName,
        courseTitle,
        sessionCode,
        timestamp: new Date().toLocaleString(),
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: teacherEmail,
        subject: `Attendance Session Started - ${courseTitle}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Session notification sent:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send session notification (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }

  async sendAttendanceReport(
    teacherEmail,
    teacherName,
    courseName,
    reportBuffer,
    format = "csv"
  ) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Attendance report email skipped for ${teacherEmail}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("attendance-report");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Attendance report email skipped for ${teacherEmail}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      const html = template({
        teacherName,
        courseName,
        courseTitle: courseName, // For backward compatibility
        format: format.toUpperCase(),
        timestamp: new Date().toLocaleString(),
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: teacherEmail,
        subject: `Attendance Report - ${courseName}`,
        html,
        attachments: [
          {
            filename: `attendance-report-${Date.now()}.${format}`,
            content: reportBuffer,
            contentType: format === "csv" ? "text/csv" : "application/pdf",
          },
        ],
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Attendance report sent:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send attendance report (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }

  async sendPasswordResetOTP(email, otp) {
    return this.sendOTP(email, otp, "password reset");
  }

  async sendWelcomeEmail(teacherEmail, teacherName, temporaryPassword) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Welcome email skipped for ${teacherEmail}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("welcome");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Welcome email skipped for ${teacherEmail}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      const html = template({
        teacherName,
        teacherEmail,
        temporaryPassword,
        loginUrl: process.env.FRONTEND_URL || "http://localhost:3000",
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: teacherEmail,
        subject: "Welcome to UniTrack Attendance System",
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Welcome email sent:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send welcome email (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }

  async sendStudentShareRequest(
    targetTeacherEmail,
    targetTeacherName,
    requesterName,
    requesterCourse,
    targetCourse,
    studentCount,
    message,
    requestId
  ) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Student share request email skipped for ${targetTeacherEmail}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("student-share-request");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Student share request email skipped for ${targetTeacherEmail}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      const html = template({
        targetTeacherName,
        requesterName,
        requesterCourse,
        targetCourse,
        studentCount,
        message,
        requestId,
        approveUrl: `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/share-requests/${requestId}`,
        timestamp: new Date().toLocaleString(),
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: targetTeacherEmail,
        subject: `Student Sharing Request from ${requesterName}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Student share request email sent:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send student share request email (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }

  async sendStudentShareResponse(
    requesterEmail,
    requesterName,
    responderName,
    requesterCourse,
    sourceCourse,
    approved,
    studentCount,
    responseMessage
  ) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Student share response email skipped for ${requesterEmail}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("student-share-response");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Student share response email skipped for ${requesterEmail}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      const html = template({
        requesterName,
        responderName,
        requesterCourse,
        sourceCourse,
        approved,
        studentCount,
        responseMessage,
        timestamp: new Date().toLocaleString(),
      });

      const subject = approved
        ? `Student Sharing Request Approved by ${responderName}`
        : `Student Sharing Request Declined by ${responderName}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: requesterEmail,
        subject,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Student share response email sent:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send student share response email (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }

  async sendSupportRequestToAdmin(adminEmail, supportData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Support request email skipped for ${adminEmail}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("support-request");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Support request email skipped for ${adminEmail}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      // Determine priority color
      const priorityColors = {
        low: "#28a745",
        medium: "#ffc107",
        high: "#fd7e14",
        urgent: "#dc3545",
      };

      const html = template({
        userName: supportData.name,
        userEmail: supportData.email,
        userType: supportData.user_type,
        subject: supportData.subject,
        category: supportData.category,
        priority: supportData.priority.toLowerCase(),
        priorityColor: priorityColors[supportData.priority] || "#6c757d",
        message: supportData.message,
        submittedAt: new Date(supportData.submittedAt).toLocaleString(),
        ticketId: supportData.ticketId,
        phone: supportData.phone,
        matricNo: supportData.matric_no,
        courseInfo: supportData.course_info
          ? JSON.stringify(supportData.course_info, null, 2)
          : null,
        errorDetails: supportData.error_details
          ? JSON.stringify(supportData.error_details, null, 2)
          : null,
        browserInfo: supportData.browser_info
          ? JSON.stringify(supportData.browser_info, null, 2)
          : null,
        ip_address: supportData.ip_address,
        user_agent: supportData.user_agent,
        systemName: "UniTrack System",
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: adminEmail,
        subject: `[Support Request] ${supportData.priority.toUpperCase()} - ${
          supportData.subject
        }`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Support request email sent to admin:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send support request email to admin (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }

  async sendSupportConfirmation(userEmail, supportData) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Support confirmation email skipped for ${userEmail}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("support-confirmation");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Support confirmation email skipped for ${userEmail}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      // Determine priority color and expected response time
      const priorityColors = {
        low: "#28a745",
        medium: "#ffc107",
        high: "#fd7e14",
        urgent: "#dc3545",
      };

      const expectedResponses = {
        low: "within 2-3 business days",
        medium: "within 1-2 business days",
        high: "within 24 hours",
        urgent: "within 4-6 hours",
      };

      const html = template({
        userName: supportData.name,
        subject: supportData.subject,
        category: supportData.category,
        priority: supportData.priority.toUpperCase(),
        priorityColor: priorityColors[supportData.priority] || "#6c757d",
        message: supportData.message,
        submittedAt: new Date(supportData.submittedAt).toLocaleString(),
        ticketId: supportData.ticketId,
        expectedResponse:
          expectedResponses[supportData.priority] || "as soon as possible",
        systemName: "UniTrack System",
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: userEmail,
        subject: `Support Request Confirmation - Ticket #${supportData.ticketId}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Support confirmation email sent:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send support confirmation email (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }

  async sendCourseAssignmentNotification({
    lecturer_email,
    lecturer_name,
    course_title,
    course_code,
    level,
    assignment_date,
    assigned_by,
    is_reassignment = false,
    previous_lecturer = null,
    reason = null,
    login_url = process.env.FRONTEND_URL || "http://localhost:3000",
  }) {
    try {
      // Check if email service is configured
      if (!this.transporter) {
        console.warn(
          `⚠️  Email service not configured - Course assignment notification skipped for ${lecturer_email}`
        );
        return { skipped: true, reason: "Email service not configured" };
      }

      const template = await this.loadTemplate("course-assignment");
      if (!template) {
        console.warn(
          `⚠️  Template not found - Course assignment notification skipped for ${lecturer_email}`
        );
        return { skipped: true, reason: "Template not found" };
      }

      const html = template({
        lecturer_name,
        course_title,
        course_code,
        level,
        assignment_date: new Date(assignment_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        assigned_by,
        is_reassignment,
        previous_lecturer,
        reason,
        login_url,
        assignment_timestamp: new Date().toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }),
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: lecturer_email,
        subject: `Course Assignment: ${course_code} - ${course_title}`,
        html: html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Course assignment notification sent:", info.messageId);
      return info;
    } catch (error) {
      console.error(
        "⚠️  Failed to send course assignment notification (skipped):",
        error.message
      );
      return { skipped: true, reason: error.message };
    }
  }
}

module.exports = EmailService;
