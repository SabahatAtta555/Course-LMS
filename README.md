# CoursePilot — Full-Stack Course LMS

CoursePilot is a portfolio-ready full-stack Learning Management System. It was rebuilt from the provided university LMS concept into a career-course platform where students can create accounts, enroll for free, complete lessons, take quizzes, track progress, and earn certificates.

## Public course website homepage

The root page now opens on a responsive public course-offering website before authentication. The refreshed design uses realistic learner photography, a premium career-focused hero, learning tracks, featured free courses, technology highlights, a three-step learning journey, learner-goal cards, platform benefits, and stronger Login / Join Free calls to action. Logged-in learners can jump from the website directly to the full catalog or their dashboard. Realistic marketing photography is loaded from Unsplash with the original local SVG artwork retained as an automatic fallback.

## Stack

- Frontend: HTML5, responsive CSS, Vanilla JavaScript SPA
- Backend: Node.js + Express
- Persistence: server-side JSON data store (`data/db.json`)
- Authentication: secure Node `scrypt` password hashing + bearer session tokens
- API: REST-style JSON endpoints


## Expanded course library

The seeded LMS catalog now includes 32 career courses. In addition to the original web-development courses, the catalog includes learning tracks for:

- Redux Toolkit and Bootstrap frontend development
- PHP backend development
- Django REST Framework, Flask and SQLite
- Java, Spring MVC and Spring Security
- API Development with Postman, Swagger and OpenAPI
- Unit Testing, Integration Testing and application maintenance
- Issue Resolution, Deployment Support, Performance Monitoring and Reliability Support
- Cloud Computing with AWS EC2, AWS S3 and AWS RDS
- Docker Hub and GitHub Actions CI/CD
- Google Maps API integrations
- Data Structures, Algorithms and Problem Solving
- Intelligent Agents, Agentic Systems and TensorFlow
- Robotics Engineering and intelligent systems

These are **course topics inside the LMS**; the LMS application itself still uses the implementation stack listed above.


## Career outcomes and job-readiness features

CoursePilot now includes a dedicated **Career Center** that connects course learning to practical next steps after completion.

- Each course displays suggested job roles connected to its skills.
- Each course explains the practical value of the learning and recommends a portfolio project.
- A completion checklist shows lesson progress, quiz requirements, and certificate status.
- The Career Center provides a preparation roadmap covering course enrollment, completion, certificate, portfolio project, CV/LinkedIn updates, interview practice, and job applications.
- Learners receive role suggestions based on the courses they are enrolled in.
- A company-research section highlights example global employers such as Google, Microsoft, Amazon, IBM, Oracle, SAP, Accenture, and Deloitte. These are examples only; CoursePilot has no affiliation with them and does not promise employment or interviews.
- The certificate section explains how to use a completion certificate on a CV, LinkedIn profile, or portfolio and clearly distinguishes it from a degree or professional license.

The Career Center preparation percentage is a planning aid based on completed learning/career tasks. It is **not** a hiring-probability score.

## Main features

- Student registration and login
- Secure password hashing (passwords are never stored as plain text)
- Role-based student, instructor, and admin accounts
- Public searchable course catalog
- Free course enrollment
- Lesson content and server-side progress tracking
- Final course quizzes with server-side grading
- Automatic certificate unlock after 100% lessons + passing quiz
- Printable certificates with unique certificate IDs
- Course-to-career role suggestions and portfolio project guidance
- Career Center with job-preparation checklist and employer research examples
- Certificate value guidance for CV, LinkedIn and portfolio use
- Student learning dashboard and recent activity
- Instructor dashboard with course creation and lesson management
- Responsive desktop, tablet, and mobile UI
- REST API health endpoint

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | `student@coursepilot.dev` | `Student123` |
| Instructor | `instructor@coursepilot.dev` | `Faculty123` |
| Admin | `admin@coursepilot.dev` | `Admin123` |

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this project folder.
3. Run:

```bash
npm install
npm start
```

4. Open `http://localhost:3000`.

For development with automatic server reload:

```bash
npm run dev
```

## Important deployment note

This project requires a Node.js server, so it **cannot run as a complete full-stack app on GitHub Pages**. GitHub Pages only hosts static frontend files. Use a Node-compatible service such as Render, Railway, Fly.io, a VPS, or another Node hosting provider for the full application. You can still keep the source repository on GitHub.

## Project structure

```text
CoursePilot-FullStack-LMS/
├── data/
│   └── db.json
├── public/
│   ├── css/styles.css
│   ├── images/
│   ├── js/app.js
│   └── index.html
├── package.json
├── README.md
└── server.js
```

## Core API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/courses`
- `GET /api/courses/:courseId`
- `POST /api/courses/:courseId/enroll`
- `POST /api/courses/:courseId/lessons/:lessonId/complete`
- `POST /api/courses/:courseId/quiz`
- `GET /api/dashboard`
- `GET /api/certificates`
- `GET /api/instructor/dashboard`
- `POST /api/instructor/courses`
- `POST /api/instructor/courses/:courseId/lessons`
- `GET /api/health`

## Portfolio description

**CoursePilot — Full-Stack Learning Management System**  
Built a full-stack LMS with Node.js, Express and JavaScript featuring secure authentication, free course enrollment, lesson progress, server-graded quizzes, role-based instructor tools and automatically generated completion certificates.
