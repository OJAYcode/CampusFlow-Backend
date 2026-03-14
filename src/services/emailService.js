const { BrevoClient } = require("@getbrevo/brevo");
const handlebars = require("handlebars");
const fs = require("fs").promises;
const path = require("path");

class EmailService {
  constructor() {
    try {
      const configuredApiKey =
        (process.env.BREVO_API_KEY || process.env.EMAIL_PASS || "").trim();

      if (!configuredApiKey) {
        console.warn(
          "⚠️  Email service disabled: Missing BREVO_API_KEY (or EMAIL_PASS) environment variable",
        );
        this.client = null;
      } else {
        if (configuredApiKey.startsWith("xsmtpsib-")) {
          console.warn(
            "⚠️  BREVO_API_KEY appears to be an SMTP key (xsmtpsib-). Use a Brevo API key from SMTP & API > API Keys.",
          );
        }

        this.client = new BrevoClient({ apiKey: configuredApiKey });
        this.senderEmail =
          process.env.EMAIL_FROM_ADDRESS ||
          process.env.EMAIL_FROM ||
          "a4b171001@smtp-brevo.com";
        this.senderName = process.env.EMAIL_FROM_NAME || "UniTrack";
        console.log("✅ Brevo email service configured");
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
      console.error("⚠️  Email service initialization failed:", error.message);
      this.client = null;
    }
  }

  // Internal send helper used by all email methods
  async _send({ to, subject, html, attachments = [] }) {
    if (!this.client) {
      console.warn(
        `⚠️  Email service not configured - skipping email to ${to}`,
      );
      return { skipped: true, reason: "Email service not configured" };
    }
    try {
      const email = {
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      };

      if (attachments.length > 0) {
        email.attachment = attachments.map((a) => ({
          name: a.filename,
          content: Buffer.isBuffer(a.content)
            ? a.content.toString("base64")
            : Buffer.from(a.content).toString("base64"),
        }));
      }

      const result =
        await this.client.transactionalEmails.sendTransacEmail(email);
      console.log(
        `✅ Email sent to ${to} — messageId: ${result?.messageId || "ok"}`,
      );
      return result;
    } catch (error) {
      const statusCode =
        error?.statusCode ||
        error?.rawResponse?.statusCode ||
        error?.response?.status ||
        null;
      const reason =
        error?.body?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Unknown email error";

      if (statusCode) {
        console.error(
          `⚠️  Failed to send email to ${to} [${statusCode}]:`,
          reason,
        );
      } else {
        console.error(`⚠️  Failed to send email to ${to}:`, reason);
      }

      if (error?.body) {
        console.error("Brevo error body:", error.body);
      }

      return { skipped: true, reason };
    }
  }

  async loadTemplate(templateName) {
    try {
      const templatePath = path.join(
        __dirname,
        "../templates/email",
        `${templateName}.hbs`,
      );
      const templateSource = await fs.readFile(templatePath, "utf8");
      return handlebars.compile(templateSource);
    } catch (error) {
      console.error(
        `⚠️  Failed to load email template ${templateName} (email skipped):`,
        error.message,
      );
      return null;
    }
  }

  async sendOTP(email, otp, purpose = "verification") {
    const template = await this.loadTemplate("otp");
    if (!template) return { skipped: true, reason: "Template not found" };
    const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      },
    );
    const html = template({ otp, purpose, expiryMinutes: 60, expiryTime });
    return this._send({ to: email, subject: `Your OTP for ${purpose}`, html });
  }

  async sendSessionNotification(
    teacherEmail,
    teacherName,
    courseTitle,
    sessionCode,
  ) {
    const template = await this.loadTemplate("session-notification");
    if (!template) return { skipped: true, reason: "Template not found" };
    const html = template({
      teacherName,
      courseTitle,
      sessionCode,
      timestamp: new Date().toLocaleString(),
    });
    return this._send({
      to: teacherEmail,
      subject: `Attendance Session Started - ${courseTitle}`,
      html,
    });
  }

  async sendAttendanceReport(
    teacherEmail,
    teacherName,
    courseName,
    reportBuffer,
    format = "csv",
  ) {
    const template = await this.loadTemplate("attendance-report");
    if (!template) return { skipped: true, reason: "Template not found" };
    const html = template({
      teacherName,
      courseName,
      courseTitle: courseName,
      format: format.toUpperCase(),
      timestamp: new Date().toLocaleString(),
    });
    return this._send({
      to: teacherEmail,
      subject: `Attendance Report - ${courseName}`,
      html,
      attachments: [
        {
          filename: `attendance-report-${Date.now()}.${format}`,
          content: reportBuffer,
        },
      ],
    });
  }

  async sendPasswordResetOTP(email, otp) {
    return this.sendOTP(email, otp, "password reset");
  }

  async sendWelcomeEmail(teacherEmail, teacherName, temporaryPassword) {
    const template = await this.loadTemplate("welcome");
    if (!template) return { skipped: true, reason: "Template not found" };
    const html = template({
      teacherName,
      teacherEmail,
      temporaryPassword,
      loginUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    });
    return this._send({
      to: teacherEmail,
      subject: "Welcome to UniTrack Attendance System",
      html,
    });
  }

  async sendStudentShareRequest(
    targetTeacherEmail,
    targetTeacherName,
    requesterName,
    requesterCourse,
    targetCourse,
    studentCount,
    message,
    requestId,
  ) {
    const template = await this.loadTemplate("student-share-request");
    if (!template) return { skipped: true, reason: "Template not found" };
    const html = template({
      targetTeacherName,
      requesterName,
      requesterCourse,
      targetCourse,
      studentCount,
      message,
      requestId,
      approveUrl: `${process.env.FRONTEND_URL || "http://localhost:3000"}/share-requests/${requestId}`,
      timestamp: new Date().toLocaleString(),
    });
    return this._send({
      to: targetTeacherEmail,
      subject: `Student Sharing Request from ${requesterName}`,
      html,
    });
  }

  async sendStudentShareResponse(
    requesterEmail,
    requesterName,
    responderName,
    requesterCourse,
    sourceCourse,
    approved,
    studentCount,
    responseMessage,
  ) {
    const template = await this.loadTemplate("student-share-response");
    if (!template) return { skipped: true, reason: "Template not found" };
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
    return this._send({ to: requesterEmail, subject, html });
  }

  async sendSupportRequestToAdmin(adminEmail, supportData) {
    const template = await this.loadTemplate("support-request");
    if (!template) return { skipped: true, reason: "Template not found" };
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
    return this._send({
      to: adminEmail,
      subject: `[Support Request] ${supportData.priority.toUpperCase()} - ${supportData.subject}`,
      html,
    });
  }

  async sendSupportConfirmation(userEmail, supportData) {
    const template = await this.loadTemplate("support-confirmation");
    if (!template) return { skipped: true, reason: "Template not found" };
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
    return this._send({
      to: userEmail,
      subject: `Support Request Confirmation - Ticket #${supportData.ticketId}`,
      html,
    });
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
    const template = await this.loadTemplate("course-assignment");
    if (!template) return { skipped: true, reason: "Template not found" };
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
    return this._send({
      to: lecturer_email,
      subject: `Course Assignment: ${course_code} - ${course_title}`,
      html,
    });
  }
}

module.exports = EmailService;
