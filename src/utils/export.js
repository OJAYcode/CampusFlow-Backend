const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } = require("docx");

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

function toAttendanceSessionCsvBuffer(session, records) {
  const rows = [
    "fullName,matricNumber",
  ];

  records.forEach((record) => {
    const values = [
      record.student?.fullName || "",
      record.student?.matricNumber || "",
    ].map((value) => String(value).replace(/,/g, ";"));

    rows.push(values.join(","));
  });

  return Buffer.from(rows.join("\n"), "utf8");
}

function toAttendanceSessionPdfBuffer(title, session, records) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const nameColumnWidth = pageWidth * 0.65;
    const matricColumnWidth = pageWidth - nameColumnWidth;
    const rowHeight = 24;

    const drawTableHeader = (y) => {
      doc.save();
      doc.fillColor("#eef3ff").rect(doc.page.margins.left, y, pageWidth, rowHeight).fill();
      doc.strokeColor("#d7def0").rect(doc.page.margins.left, y, pageWidth, rowHeight).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#1e293b")
        .text("Student name", doc.page.margins.left + 10, y + 7, { width: nameColumnWidth - 16 });
      doc
        .text("Matric number", doc.page.margins.left + nameColumnWidth + 10, y + 7, { width: matricColumnWidth - 16 });
      doc.restore();
    };

    const drawTableRow = (record, y) => {
      doc.save();
      doc.strokeColor("#e2e8f0").rect(doc.page.margins.left, y, pageWidth, rowHeight).stroke();
      doc
        .moveTo(doc.page.margins.left + nameColumnWidth, y)
        .lineTo(doc.page.margins.left + nameColumnWidth, y + rowHeight)
        .stroke("#e2e8f0");
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#0f172a")
        .text(record.student?.fullName || "Unknown student", doc.page.margins.left + 10, y + 7, {
          width: nameColumnWidth - 16,
        });
      doc.text(record.student?.matricNumber || "--", doc.page.margins.left + nameColumnWidth + 10, y + 7, {
        width: matricColumnWidth - 16,
      });
      doc.restore();
    };

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(title);
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Course: ${session.course?.title || "--"}`);
    doc.fontSize(11).text(`Session code: ${session.sessionCode || "--"}`);
    doc.fontSize(11).text(`Window: ${session.startTime || "--"} to ${session.endTime || "--"}`);
    doc.fontSize(11).text(`Successful submissions: ${records.length}`);
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

async function toAttendanceSessionDocxBuffer(title, session, records) {
  const rows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph("Student name")] }),
        new TableCell({ children: [new Paragraph("Matric Number")] }),
      ],
    }),
    ...records.map(
      (record) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(record.student?.fullName || "Unknown student")] }),
            new TableCell({ children: [new Paragraph(record.student?.matricNumber || "--")] }),
          ],
        }),
    ),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 32 })],
          }),
          new Paragraph(`Course: ${session.course?.title || "--"}`),
          new Paragraph(`Session code: ${session.sessionCode || "--"}`),
          new Paragraph(`Window: ${session.startTime || "--"} to ${session.endTime || "--"}`),
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
