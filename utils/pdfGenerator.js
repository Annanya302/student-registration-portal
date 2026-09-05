const PDFDocument = require('pdfkit');

function generateRegistrationPDF(res, registration, courses) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${registration.registration_id}.pdf"`
  );

  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text('College Name', { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(15).font('Helvetica-Bold').text('Student Semester Registration', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(11).font('Helvetica');
  const details = [
    ['Registration ID', registration.registration_id],
    ['Student Name', registration.name],
    ['Roll Number', registration.roll_no],
    ['Department', registration.department],
    ['Semester', String(registration.semester)],
    ['Academic Year', registration.academic_year],
    ['Registration Date', new Date(registration.registration_date).toLocaleString('en-IN')],
    ['Status', registration.status]
  ];

  details.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
    doc.font('Helvetica').text(value);
    doc.moveDown(0.25);
  });

  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).text('Selected Courses');
  doc.moveDown(0.5);

  courses.forEach((course, index) => {
    doc.font('Helvetica').fontSize(11).text(
      `${index + 1}. ${course.course_code} - ${course.course_name} (${course.credits} Credits)`
    );
    doc.moveDown(0.2);
  });

  doc.moveDown(2);
  doc.fontSize(9).fillColor('gray').text('This is a computer-generated registration confirmation.', {
    align: 'center'
  });

  doc.end();
}

module.exports = { generateRegistrationPDF };
