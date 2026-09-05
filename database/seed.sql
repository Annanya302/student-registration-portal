-- Demo password for all seeded students: student123
-- bcrypt hash generated for the password "student123".

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO students (roll_no, name, email, password_hash, department, semester)
VALUES
('IT101', 'Aarav Sharma', 'it101@example.com', crypt('student123', gen_salt('bf', 10)), 'Information Technology', 5),
('IT102', 'Ananya Verma', 'it102@example.com', crypt('student123', gen_salt('bf', 10)), 'Information Technology', 5),
('IT103', 'Rohan Gupta', 'it103@example.com', crypt('student123', gen_salt('bf', 10)), 'Information Technology', 5),
('CSE101', 'Priya Singh', 'cse101@example.com', crypt('student123', gen_salt('bf', 10)), 'Computer Science', 5),
('ECE101', 'Kabir Mehta', 'ece101@example.com', crypt('student123', gen_salt('bf', 10)), 'Electronics and Communication', 5)
ON CONFLICT (roll_no) DO NOTHING;

INSERT INTO courses (course_code, course_name, credits, semester)
VALUES
('CS501', 'Operating Systems', 4, 5),
('CS502', 'Database Management Systems', 4, 5),
('CS503', 'Computer Networks', 4, 5),
('CS504', 'Design and Analysis of Algorithms', 4, 5),
('CS505', 'Python Programming', 3, 5)
ON CONFLICT (course_code) DO NOTHING;
