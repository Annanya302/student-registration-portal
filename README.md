# Student Semester Registration Portal

A simple college portal where students can log in, view their student information, register for their current semester, view registration history, and download a registration confirmation PDF.

## 1. Features

- Student login using roll number and password
- bcrypt password hashing
- Student dashboard
- Current-semester course list from PostgreSQL
- Semester registration
- Duplicate registration protection
- Registration history
- Registration confirmation PDF using PDFKit
- Logout
- REST API
- `/api/health` endpoint for future AWS Application Load Balancer health checks
- Helmet, validation, parameterized SQL and environment variables

## 2. Technologies

- HTML5
- CSS3
- Vanilla JavaScript
- Node.js
- Express
- PostgreSQL
- bcrypt
- jsonwebtoken
- express-validator
- Helmet
- PDFKit
- pg

## 3. Project Structure

```text
student-registration-portal/
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
├── database/
│   ├── schema.sql
│   └── seed.sql
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── registration.html
│   ├── history.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── login.js
│       ├── dashboard.js
│       ├── registration.js
│       └── history.js
└── utils/
    └── pdfGenerator.js
```

## 4. PostgreSQL Installation

Install PostgreSQL on Windows using the official PostgreSQL installer. During installation, remember the password you create for the `postgres` user.

Make sure the PostgreSQL service is running.

## 5. Create the Database

Open SQL Shell (psql) or pgAdmin and run the first line of `database/schema.sql`:

```sql
CREATE DATABASE student_registration;
```

Then connect to the `student_registration` database and run `database/schema.sql`, followed by `database/seed.sql`.

With `psql`, an example flow is:

```text
psql -U postgres
CREATE DATABASE student_registration;
\\c student_registration
```

Then, from the project directory, run:

```bash
psql -U postgres -d student_registration -f database/schema.sql
psql -U postgres -d student_registration -f database/seed.sql
```

The seed script uses PostgreSQL `pgcrypto` to generate bcrypt-compatible password hashes for the demo accounts.

## 6. Create `.env`

Copy `.env.example` to `.env`.

Windows Command Prompt:

```cmd
copy .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set your real PostgreSQL password and a long random JWT secret:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=student_registration
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=replace_with_a_long_random_secret
```

Never commit `.env` to GitHub.

## 7. Install Dependencies

From the project folder:

```bash
npm install
```

## 8. Start the Application

Production-style start:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 9. Demo Login

```text
Roll Number: IT101
Password: student123
```

The database stores a bcrypt hash rather than the plain-text password.

## 10. Test the Application

### Login

1. Open `http://localhost:3000`.
2. Enter `IT101` and `student123`.
3. Click Login.
4. You should reach the Dashboard.

### Dashboard

Confirm that the student's name, roll number, department and semester are loaded from PostgreSQL.

### Semester Registration

1. Click `Register for Semester`.
2. Confirm that courses are loaded from PostgreSQL.
3. Select one or more courses.
4. Click `Submit Registration`.
5. Confirm the browser confirmation message.
6. A registration ID such as `REG-2026-001` is returned.
7. Click `Download Registration PDF`.

### Duplicate Registration

After registering once for the same academic year and semester, try registering again. The backend/database should reject the duplicate.

### Registration History

Open `Registration History`. The records are loaded from PostgreSQL rather than hardcoded in HTML.

### PDF

Use the PDF button from registration confirmation or history. The backend verifies that the registration belongs to the logged-in student and generates the PDF with PDFKit.

### Health Check

Open:

```text
http://localhost:3000/api/health
```

A healthy application/database returns:

```json
{
  "status": "healthy"
}
```

## 11. API Endpoints

| Method | Endpoint | Authentication |
|---|---|---|
| POST | `/api/login` | No |
| GET | `/api/student` | Bearer token |
| GET | `/api/courses` | Bearer token |
| POST | `/api/registration` | Bearer token |
| GET | `/api/registrations` | Bearer token |
| GET | `/api/registrations/:id` | Bearer token |
| GET | `/api/registrations/:id/pdf` | Bearer token |
| GET | `/api/health` | No |

## 12. Authentication

This project uses a simple JWT-based authentication flow.

After a successful login, the backend signs a short-lived token containing the student's database ID. The frontend stores the token in `localStorage` and sends it with API requests as:

```text
Authorization: Bearer <token>
```

The backend verifies the token before allowing access to student, course and registration APIs.

JWT is used instead of an in-memory server session because this application is intended to be deployable later behind an AWS Application Load Balancer and Auto Scaling Group, where multiple Node.js instances may exist.

## 13. Common Errors and Fixes

### `JWT_SECRET is missing`

Create `.env` from `.env.example` and set `JWT_SECRET`.

### PostgreSQL connection error

Check that PostgreSQL is running and that `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` are correct.

### `database "student_registration" does not exist`

Create the database first, then run the table statements and seed script.

### Login says invalid credentials

Confirm that `seed.sql` was run against the `student_registration` database and that you are using `IT101` / `student123`.

### `npm` command not found

Install Node.js LTS and reopen your terminal.

### Port already in use

Change `PORT` in `.env`, for example:

```env
PORT=3001
```

Then open `http://localhost:3001`.

## 14. Future AWS Deployment

The application does not create or configure AWS resources. It is prepared for a future deployment using:

- Amazon EC2
- Amazon RDS for PostgreSQL
- Application Load Balancer
- Auto Scaling Group
- CloudWatch
- GitHub Actions

The server reads configuration from environment variables, listens on `0.0.0.0`, exposes `/api/health`, and does not contain AWS credentials.
