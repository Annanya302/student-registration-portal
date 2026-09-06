require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const { body, validationResult } = require('express-validator');

const {
  generateRegistrationPDF
} = require('./utils/pdfGenerator');


/* =========================================================
   CREATE EXPRESS APPLICATION
========================================================= */

const app = express();


/* =========================================================
   ENVIRONMENT CONFIGURATION
========================================================= */

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;


/* =========================================================
   CHECK REQUIRED ENVIRONMENT VARIABLES
========================================================= */

if (!JWT_SECRET) {
  console.error(
    'JWT_SECRET is missing. Please create a .env file.'
  );

  process.exit(1);
}


const requiredEnvVariables = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];


for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    console.error(
      `${variable} is missing from the .env file.`
    );

    process.exit(1);
  }
}


/* =========================================================
   MYSQL CONNECTION POOL
========================================================= */

const pool = mysql.createPool({
  host: process.env.DB_HOST,

  port:
    Number(process.env.DB_PORT) || 3306,

  database: process.env.DB_NAME,

  user: process.env.DB_USER,

  password: process.env.DB_PASSWORD,

  waitForConnections: true,

  connectionLimit: 10,

  queueLimit: 0
});


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(helmet());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: false
  })
);


/*
  Serve all frontend files from public folder.

  Example:

  public/index.html
  public/style.css
  public/login.js
  public/dashboard.html

  can be accessed directly by the browser.
*/

app.use(
  express.static(
    path.join(__dirname, 'public')
  )
);


/* =========================================================
   VALIDATION ERROR HANDLER
========================================================= */

function sendValidationErrors(req, res, next) {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg
    });

  }

  next();
}


/* =========================================================
   AUTHENTICATION MIDDLEWARE
========================================================= */

function authenticate(req, res, next) {

  const authHeader =
    req.headers.authorization;


  /*
    Expected format:

    Authorization: Bearer TOKEN
  */

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {

    return res.status(401).json({
      success: false,
      message: 'Unauthorized request.'
    });

  }


  const token =
    authHeader.substring(7);


  try {

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );


    /*
      Store student ID in request.

      Other routes can access:

      req.studentId
    */

    req.studentId =
      decoded.studentId;


    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message:
        'Session expired. Please login again.'
    });

  }
}


/* =========================================================
   GET CURRENT ACADEMIC YEAR
========================================================= */

function getAcademicYear(
  date = new Date()
) {

  const month =
    date.getMonth() + 1;

  const year =
    date.getFullYear();


  /*
    Academic year starts in July.

    Example:

    August 2026
    → 2026-27

    March 2027
    → 2026-27
  */

  return month >= 7
    ? `${year}-${String(year + 1).slice(-2)}`
    : `${year - 1}-${String(year).slice(-2)}`;
}


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  '/api/health',
  async (req, res) => {

    try {

      /*
        Test database connection.
      */

      await pool.query(
        'SELECT 1'
      );


      res.json({
        success: true,
        status: 'healthy'
      });

    } catch (error) {

      console.error(
        'Health check failed:',
        error
      );


      res.status(503).json({
        success: false,
        status: 'unhealthy'
      });

    }

  }
);


/* =========================================================
   LOGIN
========================================================= */

app.post(
  '/api/login',

  [
    body('rollNo')
      .trim()
      .notEmpty()
      .withMessage(
        'Roll number is required.'
      ),

    body('password')
      .notEmpty()
      .withMessage(
        'Password is required.'
      )
  ],

  sendValidationErrors,

  async (req, res, next) => {

    try {

      const {
        rollNo,
        password
      } = req.body;


      /*
        Find student using roll number.
      */

      const [rows] =
        await pool.execute(
          `
          SELECT
            id,
            roll_no,
            name,
            password_hash
          FROM students
          WHERE roll_no = ?
          `,
          [rollNo]
        );


      /*
        Student doesn't exist.
      */

      if (rows.length === 0) {

        return res.status(401).json({
          success: false,
          message:
            'Invalid roll number or password.'
        });

      }


      const student =
        rows[0];


      /*
        Compare entered password
        with bcrypt hash stored
        in database.
      */

      const passwordMatches =
        await bcrypt.compare(
          password,
          student.password_hash
        );


      if (!passwordMatches) {

        return res.status(401).json({
          success: false,
          message:
            'Invalid roll number or password.'
        });

      }


      /*
        Create JWT token.
      */

      const token =
        jwt.sign(
          {
            studentId:
              student.id
          },

          JWT_SECRET,

          {
            expiresIn: '2h'
          }
        );


      /*
        Send token to frontend.
      */

      res.json({

        success: true,

        message:
          'Login successful.',

        token

      });

    } catch (error) {

      next(error);

    }

  }
);


/* =========================================================
   GET STUDENT INFORMATION
========================================================= */

app.get(
  '/api/student',

  authenticate,

  async (req, res, next) => {

    try {

      /*
        Get logged-in student's details.
      */

      const [rows] =
        await pool.execute(
          `
          SELECT
            id,
            roll_no,
            name,
            email,
            department,
            semester
          FROM students
          WHERE id = ?
          `,
          [req.studentId]
        );


      if (rows.length === 0) {

        return res.status(404).json({
          success: false,
          message:
            'Student not found.'
        });

      }


      const student =
        rows[0];


      /*
        Get latest registration
        of this student.
      */

      const [registrationRows] =
        await pool.execute(
          `
          SELECT
            registration_id,
            status
          FROM registrations
          WHERE student_id = ?
          ORDER BY registration_date DESC
          LIMIT 1
          `,
          [req.studentId]
        );


      res.json({

        success: true,

        student,

        registrationStatus:
          registrationRows.length > 0
            ? registrationRows[0].status
            : 'Not Registered'

      });

    } catch (error) {

      next(error);

    }

  }
);


/* =========================================================
   GET COURSES
========================================================= */

app.get(
  '/api/courses',

  authenticate,

  async (req, res, next) => {

    try {

      /*
        First get student's semester.
      */

      const [studentRows] =
        await pool.execute(
          `
          SELECT
            semester
          FROM students
          WHERE id = ?
          `,
          [req.studentId]
        );


      if (studentRows.length === 0) {

        return res.status(404).json({
          success: false,
          message:
            'Student not found.'
        });

      }


      const semester =
        studentRows[0].semester;


      /*
        Get courses for
        student's semester.
      */

      const [courseRows] =
        await pool.execute(
          `
          SELECT
            id,
            course_code,
            course_name,
            credits,
            semester
          FROM courses
          WHERE semester = ?
          ORDER BY course_code
          `,
          [semester]
        );


      res.json({

        success: true,

        academicYear:
          getAcademicYear(),

        semester,

        courses:
          courseRows

      });

    } catch (error) {

      next(error);

    }

  }
);


/* =========================================================
   REGISTER FOR SEMESTER
========================================================= */

app.post(
  '/api/registration',

  authenticate,

  [
    body('courseIds')
      .isArray({
        min: 1
      })
      .withMessage(
        'Select at least one course.'
      ),

    body('courseIds.*')
      .isInt({
        min: 1
      })
      .withMessage(
        'Invalid course selection.'
      ),

    body('academicYear')
      .trim()
      .matches(
        /^\d{4}-\d{2}$/
      )
      .withMessage(
        'Invalid academic year.'
      )
  ],

  sendValidationErrors,

  async (req, res, next) => {

    /*
      Get dedicated database connection
      because this operation uses
      a transaction.
    */

    const connection =
      await pool.getConnection();


    try {

      /*
        Remove duplicate course IDs.
      */

      const courseIds = [
        ...new Set(
          req.body.courseIds.map(
            Number
          )
        )
      ];


      const academicYear =
        req.body.academicYear;


      /* -----------------------------------------
         START TRANSACTION
      ----------------------------------------- */

      await connection.beginTransaction();


      /* -----------------------------------------
         GET STUDENT
      ----------------------------------------- */

      const [studentRows] =
        await connection.execute(
          `
          SELECT
            id,
            name,
            roll_no,
            department,
            semester
          FROM students
          WHERE id = ?
          FOR UPDATE
          `,
          [req.studentId]
        );


      if (studentRows.length === 0) {

        await connection.rollback();

        return res.status(404).json({
          success: false,
          message:
            'Student not found.'
        });

      }


      const student =
        studentRows[0];


      /* -----------------------------------------
         CHECK EXISTING REGISTRATION
      ----------------------------------------- */

      const [existingRows] =
        await connection.execute(
          `
          SELECT
            registration_id
          FROM registrations
          WHERE student_id = ?
            AND academic_year = ?
            AND semester = ?
          `,
          [
            student.id,
            academicYear,
            student.semester
          ]
        );


      if (existingRows.length > 0) {

        await connection.rollback();

        return res.status(409).json({
          success: false,
          message:
            'You have already registered for this semester.'
        });

      }


      /* -----------------------------------------
         GET SELECTED COURSES
      ----------------------------------------- */

      const placeholders =
        courseIds
          .map(() => '?')
          .join(',');


      const [coursesRows] =
        await connection.execute(
          `
          SELECT
            id,
            course_code,
            course_name,
            credits
          FROM courses
          WHERE id IN (${placeholders})
            AND semester = ?
          ORDER BY course_code
          `,
          [
            ...courseIds,
            student.semester
          ]
        );


      /*
        Make sure every selected
        course is valid.
      */

      if (
        coursesRows.length !==
        courseIds.length
      ) {

        await connection.rollback();

        return res.status(400).json({
          success: false,
          message:
            'One or more selected courses are invalid.'
        });

      }


      /* -----------------------------------------
         CREATE TEMPORARY REGISTRATION ID
      ----------------------------------------- */

      /*
        We need a registration_id
        before INSERT because the
        database generates the numeric
        AUTO_INCREMENT id only after INSERT.
      */

      const temporaryRegistrationId =
        `PENDING-${Date.now()}-${student.id}`;


      /* -----------------------------------------
         INSERT REGISTRATION
      ----------------------------------------- */

      const [
        registrationResult
      ] = await connection.execute(
        `
        INSERT INTO registrations
        (
          registration_id,
          student_id,
          academic_year,
          semester,
          status
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          temporaryRegistrationId,
          student.id,
          academicYear,
          student.semester,
          'Registered'
        ]
      );


      const registrationDbId =
        registrationResult.insertId;


      /* -----------------------------------------
         CREATE FINAL REGISTRATION ID
      ----------------------------------------- */

      const currentYear =
        new Date().getFullYear();


      const finalRegistrationId =
        `REG-${currentYear}-${String(
          registrationDbId
        ).padStart(3, '0')}`;


      /* -----------------------------------------
         UPDATE REGISTRATION ID
      ----------------------------------------- */

      await connection.execute(
        `
        UPDATE registrations
        SET registration_id = ?
        WHERE id = ?
        `,
        [
          finalRegistrationId,
          registrationDbId
        ]
      );


      /* -----------------------------------------
         INSERT REGISTRATION COURSES
      ----------------------------------------- */

      for (
        const course of coursesRows
      ) {

        await connection.execute(
          `
          INSERT INTO registration_courses
          (
            registration_id,
            course_id
          )
          VALUES (?, ?)
          `,
          [
            registrationDbId,
            course.id
          ]
        );

      }


      /* -----------------------------------------
         COMMIT TRANSACTION
      ----------------------------------------- */

      await connection.commit();


      /* -----------------------------------------
         SEND SUCCESS RESPONSE
      ----------------------------------------- */

      res.status(201).json({

        success: true,

        message:
          'Registration successful.',

        registrationId:
          finalRegistrationId

      });

    } catch (error) {

      /*
        Rollback if anything fails.
      */

      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'Rollback error:',
          rollbackError
        );
      }


      next(error);

    } finally {

      /*
        Always release database connection.
      */

      connection.release();

    }

  }
);


/* =========================================================
   REGISTRATION HISTORY
========================================================= */

app.get(
  '/api/registrations',

  authenticate,

  async (req, res, next) => {

    try {

      const [rows] =
        await pool.execute(
          `
          SELECT
            registration_id,
            academic_year,
            semester,
            registration_date,
            status
          FROM registrations
          WHERE student_id = ?
          ORDER BY registration_date DESC
          `,
          [req.studentId]
        );


      res.json({

        success: true,

        registrations:
          rows

      });

    } catch (error) {

      next(error);

    }

  }
);


/* =========================================================
   REGISTRATION DETAILS
========================================================= */

app.get(
  '/api/registrations/:id',

  authenticate,

  async (req, res, next) => {

    try {

      /*
        Get registration information.

        student_id condition ensures
        one student cannot access
        another student's registration.
      */

      const [registrationRows] =
        await pool.execute(
          `
          SELECT
            r.registration_id,
            r.academic_year,
            r.semester,
            r.registration_date,
            r.status,
            s.name,
            s.roll_no,
            s.department
          FROM registrations r
          JOIN students s
            ON s.id = r.student_id
          WHERE r.registration_id = ?
            AND r.student_id = ?
          `,
          [
            req.params.id,
            req.studentId
          ]
        );


      if (
        registrationRows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            'Registration not found.'
        });

      }


      /*
        Get courses belonging
        to this registration.
      */

      const [coursesRows] =
        await pool.execute(
          `
          SELECT
            c.course_code,
            c.course_name,
            c.credits
          FROM registration_courses rc
          JOIN registrations r
            ON r.id = rc.registration_id
          JOIN courses c
            ON c.id = rc.course_id
          WHERE r.registration_id = ?
            AND r.student_id = ?
          ORDER BY c.course_code
          `,
          [
            req.params.id,
            req.studentId
          ]
        );


      res.json({

        success: true,

        registration:
          registrationRows[0],

        courses:
          coursesRows

      });

    } catch (error) {

      next(error);

    }

  }
);


/* =========================================================
   REGISTRATION PDF
========================================================= */

app.get(
  '/api/registrations/:id/pdf',

  authenticate,

  async (req, res, next) => {

    try {

      /*
        Get registration details.
      */

      const [registrationRows] =
        await pool.execute(
          `
          SELECT
            r.registration_id,
            r.academic_year,
            r.semester,
            r.registration_date,
            r.status,
            s.name,
            s.roll_no,
            s.department
          FROM registrations r
          JOIN students s
            ON s.id = r.student_id
          WHERE r.registration_id = ?
            AND r.student_id = ?
          `,
          [
            req.params.id,
            req.studentId
          ]
        );


      if (
        registrationRows.length === 0
      ) {

        return res.status(404).json({
          success: false,
          message:
            'Registration not found.'
        });

      }


      /*
        Get registered courses.
      */

      const [coursesRows] =
        await pool.execute(
          `
          SELECT
            c.course_code,
            c.course_name,
            c.credits
          FROM registration_courses rc
          JOIN registrations r
            ON r.id = rc.registration_id
          JOIN courses c
            ON c.id = rc.course_id
          WHERE r.registration_id = ?
            AND r.student_id = ?
          ORDER BY c.course_code
          `,
          [
            req.params.id,
            req.studentId
          ]
        );


      /*
        Generate PDF and send it
        directly to browser.
      */

      generateRegistrationPDF(
        res,
        registrationRows[0],
        coursesRows
      );

    } catch (error) {

      next(error);

    }

  }
);


/* =========================================================
   HOME PAGE
========================================================= */

app.get(
  '/',
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'public',
        'index.html'
      )
    );

  }
);


/* =========================================================
   API 404 HANDLER
========================================================= */

app.use(
  (req, res, next) => {

    /*
      Return JSON for unknown API routes.
    */

    if (
      req.path.startsWith('/api/')
    ) {

      return res.status(404).json({

        success: false,

        message:
          'API endpoint not found.'

      });

    }


    next();

  }
);


/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {

    console.error(
      'Server error:',
      error
    );


    /*
      If response has already started,
      let Express handle the error.
    */

    if (res.headersSent) {

      return next(error);

    }


    res.status(500).json({

      success: false,

      message:
        'Something went wrong on the server.'

    });

  }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log(
      `Student Registration Portal running on port ${PORT}`
    );

    console.log(
      `Environment: ${process.env.NODE_ENV || 'development'}`
    );

  }
);