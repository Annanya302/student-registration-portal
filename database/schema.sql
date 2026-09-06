CREATE DATABASE IF NOT EXISTS student_registration;

USE student_registration;


-- =========================================================
-- STUDENTS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,

    roll_no VARCHAR(30) UNIQUE NOT NULL,

    name VARCHAR(100) NOT NULL,

    email VARCHAR(150) UNIQUE NOT NULL,

    password_hash VARCHAR(255) NOT NULL,

    department VARCHAR(100) NOT NULL,

    semester INT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_student_semester
        CHECK (semester BETWEEN 1 AND 8)
);


-- =========================================================
-- COURSES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,

    course_code VARCHAR(30) UNIQUE NOT NULL,

    course_name VARCHAR(150) NOT NULL,

    credits INT NOT NULL,

    semester INT NOT NULL,

    CONSTRAINT chk_course_credits
        CHECK (credits > 0),

    CONSTRAINT chk_course_semester
        CHECK (semester BETWEEN 1 AND 8)
);


-- =========================================================
-- REGISTRATIONS TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,

    registration_id VARCHAR(50) UNIQUE NOT NULL,

    student_id INT NOT NULL,

    academic_year VARCHAR(20) NOT NULL,

    semester INT NOT NULL,

    registration_date TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(30) NOT NULL
        DEFAULT 'Registered',

    CONSTRAINT chk_registration_semester
        CHECK (semester BETWEEN 1 AND 8),

    CONSTRAINT fk_registrations_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_student_semester_registration
        UNIQUE (student_id, academic_year, semester)
);


-- =========================================================
-- REGISTRATION COURSES TABLE
-- =========================================================

CREATE TABLE IF NOT EXISTS registration_courses (
    id INT AUTO_INCREMENT PRIMARY KEY,

    registration_id INT NOT NULL,

    course_id INT NOT NULL,

    CONSTRAINT fk_registration_courses_registration
        FOREIGN KEY (registration_id)
        REFERENCES registrations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_registration_courses_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE RESTRICT,

    CONSTRAINT unique_registration_course
        UNIQUE (registration_id, course_id)
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_registrations_student_id
    ON registrations(student_id);

CREATE INDEX idx_registration_courses_registration_id
    ON registration_courses(registration_id);