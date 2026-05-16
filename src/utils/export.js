const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = require("docx");

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toCsvBuffer(report) {
  const rows = [];

  function append(prefix, value) {
    rows.push(`${prefix},${String(value ?? "").replace(/,/g, ";")}`);
  }

  Object.entries(report).forEach(([section, values]) => {
    if (values && typeof values === "object" && !Array.isArray(values)) {
      rows.push(section.toUpperCase());
      Object.entries(values).forEach(([key, value]) => append(key, value));
      rows.push("");
      return;
    }

    append(section, values);
  });

  return Buffer.from(rows.join("\n"), "utf8");
}

function toPdfBuffer(title, report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title);
    doc.moveDown();

    Object.entries(report).forEach(([section, values]) => {
      doc.fontSize(14).text(section);
      doc.moveDown(0.5);

      if (values && typeof values === "object" && !Array.isArray(values)) {
        Object.entries(values).forEach(([key, value]) => {
          doc.fontSize(11).text(`${key}: ${value}`);
        });
      } else {
        doc.fontSize(11).text(String(values));
      }

      doc.moveDown();
    });

    doc.end();
  });
}

function toAttendanceSessionCsvBuffer(session, records, details = {}) {
  const {
    totalCourseSessions = "",
    averageAttendancePercentage = "",
    attendanceRateByStudent = {},
  } = details;
  const rows = [
    `Course,${String(session.course?.title || "").replace(/,/g, ";")}`,
    `Course code,${String(session.course?.code || "").replace(/,/g, ";")}`,
    `Session code,${String(session.sessionCode || "").replace(/,/g, ";")}`,
    `Session status,${String(session.status || "").replace(/,/g, ";")}`,
    `Venue,${String(session.roomLabel || session.detectedVenueLabel || "").replace(/,/g, ";")}`,
    `Session start,${String(formatDateTime(session.startTime)).replace(/,/g, ";")}`,
    `Session end,${String(formatDateTime(session.endTime)).replace(/,/g, ";")}`,
    `Total course sessions,${String(totalCourseSessions).replace(/,/g, ";")}`,
    `Average course attendance,${String(averageAttendancePercentage).replace(/,/g, ";")}%`,
    `Successful submissions,${records.length}`,
    "",
    "fullName,matricNumber,email,submittedAt,attendanceRate,totalSubmittedSessions,missedSessions,sessionDate",
  ];

  records.forEach((record) => {
    const studentId = record.student?._id?.toString?.() || record.student?.toString?.();
    const attendance = studentId ? attendanceRateByStudent[studentId] : null;
    const values = [
      record.student?.fullName || "",
      record.student?.matricNumber || "",
      record.student?.email || "",
      formatDateTime(record.submittedAt || record.createdAt),
      attendance ? `${attendance.attendancePercentage}%` : "--",
      attendance?.submittedSessions ?? "--",
      attendance?.missedSessions ?? "--",
      formatDateTime(session.startTime),
    ].map((value) => String(value).replace(/,/g, ";"));

    rows.push(values.join(","));
  });

  return Buffer.from(rows.join("\n"), "utf8");
}

function toAttendanceSessionPdfBuffer(title, session, records, details = {}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 32, layout: "landscape" });
    const chunks = [];
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const columnWidths = [
      pageWidth * 0.23,
      pageWidth * 0.13,
      pageWidth * 0.19,
      pageWidth * 0.13,
      pageWidth * 0.11,
      pageWidth * 0.11,
      pageWidth * 0.10,
    ];
    const rowHeight = 24;
    const {
      totalCourseSessions = 0,
      averageAttendancePercentage = 0,
      attendanceRateByStudent = {},
    } = details;

    const drawTableHeader = (y) => {
      doc.save();
      doc.fillColor("#eef3ff").rect(doc.page.margins.left, y, pageWidth, rowHeight).fill();
      doc.strokeColor("#d7def0").rect(doc.page.margins.left, y, pageWidth, rowHeight).stroke();
      const headers = ["Student name", "Matric number", "Submitted at", "Attendance rate", "Submitted", "Missed", "Session date"];
      let cursor = doc.page.margins.left;
      headers.forEach((header, index) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#1e293b")
          .text(header, cursor + 8, y + 7, { width: columnWidths[index] - 12 });
        cursor += columnWidths[index];
        if (index < headers.length - 1) {
          doc.moveTo(cursor, y).lineTo(cursor, y + rowHeight).stroke("#d7def0");
        }
      });
      doc.restore();
    };

    const drawTableRow = (record, y) => {
      const studentId = record.student?._id?.toString?.() || record.student?.toString?.();
      const attendance = studentId ? attendanceRateByStudent[studentId] : null;
      const values = [
        record.student?.fullName || "Unknown student",
        record.student?.matricNumber || "--",
        formatDateTime(record.submittedAt || record.createdAt),
        attendance ? `${attendance.attendancePercentage}%` : "--",
        attendance?.submittedSessions ?? "--",
        attendance?.missedSessions ?? "--",
        formatDateTime(session.startTime),
      ];

      doc.save();
      doc.strokeColor("#e2e8f0").rect(doc.page.margins.left, y, pageWidth, rowHeight).stroke();
      let cursor = doc.page.margins.left;
      values.forEach((value, index) => {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#0f172a")
          .text(String(value), cursor + 8, y + 7, {
            width: columnWidths[index] - 12,
            ellipsis: true,
          });
        cursor += columnWidths[index];
        if (index < values.length - 1) {
          doc.moveTo(cursor, y).lineTo(cursor, y + rowHeight).stroke("#e2e8f0");
        }
      });
      doc.restore();
    };

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title);
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Course: ${session.course?.title || "--"} (${session.course?.code || "--"})`);
    doc.fontSize(11).text(`Session code: ${session.sessionCode || "--"}`);
    doc.fontSize(11).text(`Session status: ${session.status || "--"}`);
    doc.fontSize(11).text(`Venue: ${session.roomLabel || session.detectedVenueLabel || "--"}`);
    doc.fontSize(11).text(`Window: ${formatDateTime(session.startTime)} to ${formatDateTime(session.endTime)}`);
    doc.fontSize(11).text(`Course sessions so far: ${totalCourseSessions}`);
    doc.fontSize(11).text(`Average course attendance: ${averageAttendancePercentage}%`);
    doc.fontSize(11).text(`Successful submissions for this session: ${records.length}`);
    doc.moveDown(1.25);

    let y = doc.y;
    drawTableHeader(y);
    y += rowHeight;

    records.forEach((record) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawTableHeader(y);
        y += rowHeight;
      }

      drawTableRow(record, y);
      y += rowHeight;
    });

    doc.end();
  });
}

async function toAttendanceSessionDocxBuffer(title, session, records, details = {}) {
  const {
    totalCourseSessions = 0,
    averageAttendancePercentage = 0,
    attendanceRateByStudent = {},
  } = details;
  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Student name")] }),
        new TableCell({ children: [new Paragraph("Matric Number")] }),
        new TableCell({ children: [new Paragraph("Submitted at")] }),
        new TableCell({ children: [new Paragraph("Attendance rate")] }),
        new TableCell({ children: [new Paragraph("Submitted")] }),
        new TableCell({ children: [new Paragraph("Missed")] }),
      ],
    }),
    ...records.map(
      (record) => {
        const studentId = record.student?._id?.toString?.() || record.student?.toString?.();
        const attendance = studentId ? attendanceRateByStudent[studentId] : null;
        return (
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(record.student?.fullName || "Unknown student")] }),
            new TableCell({ children: [new Paragraph(record.student?.matricNumber || "--")] }),
            new TableCell({ children: [new Paragraph(formatDateTime(record.submittedAt || record.createdAt))] }),
            new TableCell({ children: [new Paragraph(attendance ? `${attendance.attendancePercentage}%` : "--")] }),
            new TableCell({ children: [new Paragraph(String(attendance?.submittedSessions ?? "--"))] }),
            new TableCell({ children: [new Paragraph(String(attendance?.missedSessions ?? "--"))] }),
          ],
        })
      );
      },
    ),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
          }),
          new Paragraph(`Course: ${session.course?.title || "--"} (${session.course?.code || "--"})`),
          new Paragraph(`Session code: ${session.sessionCode || "--"}`),
          new Paragraph(`Session status: ${session.status || "--"}`),
          new Paragraph(`Venue: ${session.roomLabel || session.detectedVenueLabel || "--"}`),
          new Paragraph(`Window: ${formatDateTime(session.startTime)} to ${formatDateTime(session.endTime)}`),
          new Paragraph(`Course sessions so far: ${totalCourseSessions}`),
          new Paragraph(`Average course attendance: ${averageAttendancePercentage}%`),
          new Paragraph(`Successful submissions: ${records.length}`),
          new Paragraph(""),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = {
  toCsvBuffer,
  toPdfBuffer,
  toAttendanceSessionCsvBuffer,
  toAttendanceSessionPdfBuffer,
  toAttendanceSessionDocxBuffer,
};
