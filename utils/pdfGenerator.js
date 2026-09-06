const PDFDocument = require('pdfkit');

function generateRegistrationPDF(res, registration, courses) {

    // ========================================
    // Create PDF
    // ========================================

    const doc = new PDFDocument({
        size: 'A4',
        margin: 50
    });


    // ========================================
    // Response Headers
    // ========================================

    const registrationId =
        registration.registration_id || 'registration';

    res.setHeader(
        'Content-Type',
        'application/pdf'
    );

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${registrationId}.pdf"`
    );


    // Send PDF to browser
    doc.pipe(res);


    // ========================================
    // Header
    // ========================================

    doc
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(
            'College Name',
            {
                align: 'center'
            }
        );

    doc.moveDown(0.4);

    doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(
            'Student Semester Registration',
            {
                align: 'center'
            }
        );

    doc.moveDown(1.5);


    // ========================================
    // Student Information
    // ========================================

    doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Registration Details');

    doc.moveDown(0.6);


    const registrationDate =
        registration.registration_date
            ? new Date(
                registration.registration_date
            ).toLocaleString('en-IN')
            : '-';


    const details = [

        [
            'Registration ID',
            registration.registration_id
        ],

        [
            'Student Name',
            registration.name
        ],

        [
            'Roll Number',
            registration.roll_no
        ],

        [
            'Department',
            registration.department
        ],

        [
            'Semester',
            registration.semester
        ],

        [
            'Academic Year',
            registration.academic_year
        ],

        [
            'Registration Date',
            registrationDate
        ],

        [
            'Status',
            registration.status
        ]

    ];


    details.forEach(([label, value]) => {

        doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .text(
                `${label}: `,
                {
                    continued: true
                }
            );

        doc
            .font('Helvetica')
            .text(
                value !== null &&
                value !== undefined
                    ? String(value)
                    : '-'
            );

        doc.moveDown(0.25);
    });


    // ========================================
    // Selected Courses
    // ========================================

    doc.moveDown(1);

    doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Selected Courses');

    doc.moveDown(0.6);


    // ========================================
    // Course Table Header
    // ========================================

    const tableTop =
        doc.y;

    const col1 = 50;
    const col2 = 125;
    const col3 = 350;
    const col4 = 470;


    doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(
            'No.',
            col1,
            tableTop
        );

    doc.text(
        'Course Code',
        col2,
        tableTop
    );

    doc.text(
        'Course Name',
        col3,
        tableTop
    );

    doc.text(
        'Credits',
        col4,
        tableTop
    );


    doc.moveDown(0.4);


    // ========================================
    // Courses
    // ========================================

    let totalCredits = 0;

    courses.forEach((course, index) => {

        const courseCredits =
            Number(course.credits) || 0;

        totalCredits += courseCredits;


        doc
            .font('Helvetica')
            .fontSize(9);

        const currentY =
            doc.y;


        doc.text(
            String(index + 1),
            col1,
            currentY
        );

        doc.text(
            String(course.course_code || '-'),
            col2,
            currentY
        );

        doc.text(
            String(course.course_name || '-'),
            col3,
            currentY,
            {
                width: 110
            }
        );

        doc.text(
            String(courseCredits),
            col4,
            currentY
        );


        doc.moveDown(0.6);
    });


    // ========================================
    // Total Credits
    // ========================================

    doc.moveDown(0.5);

    doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(
            `Total Credits: ${totalCredits}`,
            {
                align: 'right'
            }
        );


    // ========================================
    // Footer
    // ========================================

    doc.moveDown(2);

    doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('gray')
        .text(
            'This is a computer-generated registration confirmation.',
            {
                align: 'center'
            }
        );


    doc
        .fontSize(9)
        .text(
            'No signature is required.',
            {
                align: 'center'
            }
        );


    // ========================================
    // Finish PDF
    // ========================================

    doc.end();
}


module.exports = {
    generateRegistrationPDF
};