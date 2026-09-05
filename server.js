require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');
const { generateRegistrationPDF } = require('./utils/pdfGenerator');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is missing. Create a .env file before starting the server.');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000
});

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

function sendValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized request.' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.studentId = decoded.studentId;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
}

function getAcademicYear(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 7 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
}

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch {
    res.status(503).json({ status: 'unhealthy' });
  }
});

app.post(
  '/api/login',
  [
    body('rollNo').trim().notEmpty().withMessage('Roll number is required.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  sendValidationErrors,
  async (req, res, next) => {
    try {
      const { rollNo, password } = req.body;
      const result = await pool.query(
        'SELECT id, roll_no, name, password_hash FROM students WHERE roll_no = $1',
        [rollNo]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ success: false, message: 'Invalid roll number or password.' });
      }

      const student = result.rows[0];
      const passwordMatches = await bcrypt.compare(password, student.password_hash);

      if (!passwordMatches) {
        return res.status(401).json({ success: false, message: 'Invalid roll number or password.' });
      }

      const token = jwt.sign({ studentId: student.id }, JWT_SECRET, { expiresIn: '2h' });
      res.json({ success: true, message: 'Login successful.', token });
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/student', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, roll_no, name, email, department, semester
       FROM students WHERE id = $1`,
      [req.studentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const student = result.rows[0];
    const registration = await pool.query(
      `SELECT registration_id, status
       FROM registrations
       WHERE student_id = $1
       ORDER BY registration_date DESC
       LIMIT 1`,
      [req.studentId]
    );

    res.json({
      success: true,
      student,
      registrationStatus: registration.rowCount ? registration.rows[0].status : 'Not Registered'
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/courses', authenticate, async (req, res, next) => {
  try {
    const studentResult = await pool.query('SELECT semester FROM students WHERE id = $1', [req.studentId]);
    if (studentResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const semester = studentResult.rows[0].semester;
    const result = await pool.query(
      `SELECT id, course_code, course_name, credits, semester
       FROM courses WHERE semester = $1 ORDER BY course_code`,
      [semester]
    );

    res.json({ success: true, academicYear: getAcademicYear(), semester, courses: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/registration',
  authenticate,
  [
    body('courseIds').isArray({ min: 1 }).withMessage('Select at least one course.'),
    body('courseIds.*').isInt({ min: 1 }).withMessage('Invalid course selection.'),
    body('academicYear').trim().matches(/^\d{4}-\d{2}$/).withMessage('Invalid academic year.')
  ],
  sendValidationErrors,
  async (req, res, next) => {
    const client = await pool.connect();

    try {
      const courseIds = [...new Set(req.body.courseIds.map(Number))];
      const academicYear = req.body.academicYear;

      await client.query('BEGIN');

      const studentResult = await client.query(
        'SELECT id, name, roll_no, department, semester FROM students WHERE id = $1 FOR UPDATE',
        [req.studentId]
      );

      if (studentResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Student not found.' });
      }

      const student = studentResult.rows[0];

      const existing = await client.query(
        `SELECT registration_id FROM registrations
         WHERE student_id = $1 AND academic_year = $2 AND semester = $3`,
        [student.id, academicYear, student.semester]
      );

      if (existing.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'You have already registered for this semester.' });
      }

      const coursesResult = await client.query(
        `SELECT id, course_code, course_name, credits
         FROM courses
         WHERE id = ANY($1::int[]) AND semester = $2
         ORDER BY course_code`,
        [courseIds, student.semester]
      );

      if (coursesResult.rowCount !== courseIds.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'One or more selected courses are invalid.' });
      }

      const registrationInsert = await client.query(
        `INSERT INTO registrations
         (id, registration_id, student_id, academic_year, semester, status)
         VALUES (nextval(pg_get_serial_sequence('registrations', 'id')),
                 'PENDING-' || currval(pg_get_serial_sequence('registrations', 'id'))::text,
                 $1, $2, $3, 'Registered')
         RETURNING id, registration_id, registration_date, status`,
        [student.id, academicYear, student.semester]
      );

      const registration = registrationInsert.rows[0];
      const finalRegistrationId = `REG-${new Date(registration.registration_date).getFullYear()}-${String(registration.id).padStart(3, '0')}`;

      await client.query(
        'UPDATE registrations SET registration_id = $1 WHERE id = $2',
        [finalRegistrationId, registration.id]
      );

      for (const course of coursesResult.rows) {
        await client.query(
          `INSERT INTO registration_courses (registration_id, course_id)
           VALUES ($1, $2)`,
          [registration.id, course.id]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        registrationId: finalRegistrationId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

app.get('/api/registrations', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT registration_id, academic_year, semester, registration_date, status
       FROM registrations
       WHERE student_id = $1
       ORDER BY registration_date DESC`,
      [req.studentId]
    );

    res.json({ success: true, registrations: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get('/api/registrations/:id', authenticate, async (req, res, next) => {
  try {
    const registrationResult = await pool.query(
      `SELECT r.registration_id, r.academic_year, r.semester, r.registration_date, r.status,
              s.name, s.roll_no, s.department
       FROM registrations r
       JOIN students s ON s.id = r.student_id
       WHERE r.registration_id = $1 AND r.student_id = $2`,
      [req.params.id, req.studentId]
    );

    if (registrationResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    const coursesResult = await pool.query(
      `SELECT c.course_code, c.course_name, c.credits
       FROM registration_courses rc
       JOIN registrations r ON r.id = rc.registration_id
       JOIN courses c ON c.id = rc.course_id
       WHERE r.registration_id = $1 AND r.student_id = $2
       ORDER BY c.course_code`,
      [req.params.id, req.studentId]
    );

    res.json({
      success: true,
      registration: registrationResult.rows[0],
      courses: coursesResult.rows
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/registrations/:id/pdf', authenticate, async (req, res, next) => {
  try {
    const registrationResult = await pool.query(
      `SELECT r.registration_id, r.academic_year, r.semester, r.registration_date, r.status,
              s.name, s.roll_no, s.department
       FROM registrations r
       JOIN students s ON s.id = r.student_id
       WHERE r.registration_id = $1 AND r.student_id = $2`,
      [req.params.id, req.studentId]
    );

    if (registrationResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found.' });
    }

    const coursesResult = await pool.query(
      `SELECT c.course_code, c.course_name, c.credits
       FROM registration_courses rc
       JOIN registrations r ON r.id = rc.registration_id
       JOIN courses c ON c.id = rc.course_id
       WHERE r.registration_id = $1 AND r.student_id = $2
       ORDER BY c.course_code`,
      [req.params.id, req.studentId]
    );

    generateRegistrationPDF(res, registrationResult.rows[0], coursesResult.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  next();
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ success: false, message: 'Something went wrong on the server.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Student Registration Portal running on http://localhost:${PORT}`);
});
