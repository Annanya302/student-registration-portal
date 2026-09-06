# Student Semester Registration Portal

A simple and beginner-friendly college portal where students can:

- Log in using roll number and password
- View their student information
- View courses for their current semester
- Register for their semester
- Prevent duplicate semester registration
- View registration history
- Download registration confirmation as PDF
- Log out securely

The application is built using Node.js, Express, MySQL and vanilla JavaScript and is designed to be deployable on AWS EC2 with Amazon RDS for MySQL.

---

## 1. Features

- Student login using roll number and password
- bcrypt password hashing
- JWT-based authentication
- Student dashboard
- Current-semester course list from MySQL
- Semester registration
- Duplicate registration protection
- Registration history
- Registration confirmation PDF using PDFKit
- Logout
- REST API
- `/api/health` endpoint
- Helmet security middleware
- Request validation using express-validator
- Parameterized SQL queries
- Environment variable configuration
- MySQL connection pooling

---

## 2. Technologies

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript

### Backend

- Node.js
- Express.js

### Database

- MySQL
- mysql2

### Authentication and Security

- bcrypt
- JSON Web Token (JWT)
- Helmet
- express-validator
- Environment variables

### PDF

- PDFKit

### Deployment

- GitHub
- Amazon EC2
- Amazon RDS for MySQL
- Application Load Balancer
- Auto Scaling Group
- CloudWatch

---

## 3. Project Structure

```text
student-registration-portal/
│
├── server.js
├── package.json
├── package-lock.json
├── .env
├── .env.example
├── .gitignore
├── README.md
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── public/
│   ├── index.html
│   ├── login.js
│   ├── dashboard.html
│   ├── history.html
│   ├── registration.html
│   ├── style.css
│   │
│   └── js/
│       ├── dashboard.js
│       ├── registration.js
│       └── history.js
│
└── utils/
    └── pdfGenerator.js