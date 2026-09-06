USE student_registration;


-- =========================================================
-- DEMO STUDENTS
-- Password for all students:
-- student123
--
-- Replace YOUR_BCRYPT_HASH_HERE with the bcrypt hash
-- generated using database/generate-hash.js
-- =========================================================

INSERT IGNORE INTO students
(
    roll_no,
    name,
    email,
    password_hash,
    department,
    semester
)
VALUES
(
    'IT101',
    'Aarav Sharma',
    'it101@example.com',
    'YOUR_BCRYPT_HASH_HERE',
    'Information Technology',
    5
),
(
    'IT102',
    'Ananya Gupta',
    'it102@example.com',
    'YOUR_BCRYPT_HASH_HERE',
    'Information Technology',
    5
),
(
    'IT103',
    'Rohan Verma',
    'it103@example.com',
    'YOUR_BCRYPT_HASH_HERE',
    'Information Technology',
    5
),
(
    'CSE101',
    'Priya Singh',
    'cse101@example.com',
    'YOUR_BCRYPT_HASH_HERE',
    'Computer Science',
    5
),
(
    'ECE101',
    'Kabir Mehta',
    'kabir.mehta@example.com',
    'YOUR_BCRYPT_HASH_HERE',
    'Electronics and Communication',
    5
);


-- =========================================================
-- DEMO COURSES
-- =========================================================

INSERT IGNORE INTO courses
(
    course_code,
    course_name,
    credits,
    semester
)
VALUES
(
    'CS501',
    'Operating Systems',
    4,
    5
),
(
    'CS502',
    'Database Management Systems',
    4,
    5
),
(
    'CS503',
    'Computer Networks',
    4,
    5
),
(
    'CS504',
    'Design and Analysis of Algorithms',
    4,
    5
),
(
    'CS505',
    'Python Programming',
    3,
    5
);