const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const SESSION_HOURS = 72;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function now() { return new Date().toISOString(); }
function id(prefix='id') { return `${prefix}_${crypto.randomBytes(6).toString('hex')}`; }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function readDb() { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
function writeDb(db) { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(check, Buffer.from(hash, 'hex'));
}
function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}
function auth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Please sign in first.' });
  const db = readDb();
  const session = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  const user = db.users.find(u => u.id === session.userId);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  req.user = user;
  req.db = db;
  req.token = token;
  next();
}
function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have permission for this action.' });
}
function progressFor(db, userId, course) {
  const enrollment = db.enrollments.find(e => e.userId === userId && e.courseId === course.id);
  if (!enrollment) return 0;
  const done = enrollment.completedLessonIds?.length || 0;
  return course.lessons.length ? Math.round(done / course.lessons.length * 100) : 0;
}
function courseView(db, course, userId) {
  const instructor = db.users.find(u => u.id === course.instructorId);
  const enrollment = userId ? db.enrollments.find(e => e.userId === userId && e.courseId === course.id) : null;
  const safeQuiz = (course.quiz || []).map(({ answer, ...question }) => question);
  return {
    ...course,
    quiz: safeQuiz,
    instructor: instructor ? instructor.name : 'CoursePilot Instructor',
    enrolled: Boolean(enrollment),
    progress: userId ? progressFor(db, userId, course) : 0,
    completedLessonIds: enrollment?.completedLessonIds || [],
    quizBestScore: enrollment?.quizBestScore ?? null,
    certificateIssuedAt: enrollment?.certificateIssuedAt || null
  };
}

app.post('/api/auth/register', (req, res) => {
  const { name='', email='', password='' } = req.body;
  const cleanEmail = email.trim().toLowerCase();
  if (name.trim().length < 2) return res.status(400).json({ error: 'Enter your full name.' });
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) return res.status(400).json({ error: 'Password needs 8+ characters, one uppercase letter and one number.' });
  const db = readDb();
  if (db.users.some(u => u.email === cleanEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const user = { id: id('usr'), name: name.trim(), email: cleanEmail, passwordHash: hashPassword(password), role: 'student', joinedAt: now() };
  db.users.push(user);
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({ token, userId: user.id, createdAt: now(), expiresAt: new Date(Date.now() + SESSION_HOURS * 3600000).toISOString() });
  writeDb(db);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email='', password='' } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.email === email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions = db.sessions.filter(s => new Date(s.expiresAt) > new Date());
  db.sessions.push({ token, userId: user.id, createdAt: now(), expiresAt: new Date(Date.now() + SESSION_HOURS * 3600000).toISOString() });
  writeDb(db);
  res.json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/logout', auth, (req, res) => {
  req.db.sessions = req.db.sessions.filter(s => s.token !== req.token);
  writeDb(req.db);
  res.json({ ok: true });
});

app.get('/api/me', auth, (req, res) => res.json({ user: sanitizeUser(req.user) }));

app.get('/api/courses', (req, res) => {
  const db = readDb();
  const q = String(req.query.search || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim().toLowerCase();
  const level = String(req.query.level || '').trim().toLowerCase();
  const token = getToken(req);
  let userId = null;
  if (token) userId = db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date())?.userId || null;
  let result = db.courses.filter(c => c.published !== false);
  if (q) result = result.filter(c => `${c.title} ${c.description} ${c.category} ${c.skills.join(' ')}`.toLowerCase().includes(q));
  if (category) result = result.filter(c => c.category.toLowerCase() === category);
  if (level) result = result.filter(c => c.level.toLowerCase() === level);
  res.json({ courses: result.map(c => courseView(db, c, userId)) });
});

app.get('/api/courses/:courseId', (req, res) => {
  const db = readDb();
  const course = db.courses.find(c => c.id === req.params.courseId && c.published !== false);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const token = getToken(req);
  const session = token ? db.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date()) : null;
  const view = courseView(db, course, session?.userId || null);
  if (!view.enrolled) view.quiz = undefined;
  res.json({ course: view });
});

app.get('/api/dashboard', auth, (req, res) => {
  const db = req.db;
  const enrollments = db.enrollments.filter(e => e.userId === req.user.id);
  const enrolledCourses = enrollments.map(e => db.courses.find(c => c.id === e.courseId)).filter(Boolean).map(c => courseView(db, c, req.user.id));
  const avgProgress = enrolledCourses.length ? Math.round(enrolledCourses.reduce((sum, c) => sum + c.progress, 0) / enrolledCourses.length) : 0;
  const completed = enrolledCourses.filter(c => c.certificateIssuedAt).length;
  res.json({
    stats: { enrolled: enrolledCourses.length, avgProgress, completed, certificates: completed },
    courses: enrolledCourses,
    recentActivity: enrollments.flatMap(e => e.activity || []).sort((a,b) => new Date(b.at)-new Date(a.at)).slice(0,6)
  });
});

app.post('/api/courses/:courseId/enroll', auth, (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Only student accounts can enroll in courses.' });
  const db = req.db;
  const course = db.courses.find(c => c.id === req.params.courseId && c.published !== false);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const existing = db.enrollments.find(e => e.userId === req.user.id && e.courseId === course.id);
  if (existing) return res.json({ enrollment: existing, message: 'You are already enrolled.' });
  const enrollment = { id: id('enr'), userId: req.user.id, courseId: course.id, enrolledAt: now(), completedLessonIds: [], quizAttempts: [], quizBestScore: null, certificateIssuedAt: null, activity: [{ type: 'enrolled', text: `Enrolled in ${course.title}`, at: now() }] };
  db.enrollments.push(enrollment);
  writeDb(db);
  res.status(201).json({ enrollment, course: courseView(db, course, req.user.id) });
});

app.post('/api/courses/:courseId/lessons/:lessonId/complete', auth, (req, res) => {
  const db = req.db;
  const course = db.courses.find(c => c.id === req.params.courseId);
  const lesson = course?.lessons.find(l => l.id === req.params.lessonId);
  if (!course || !lesson) return res.status(404).json({ error: 'Lesson not found.' });
  const enrollment = db.enrollments.find(e => e.userId === req.user.id && e.courseId === course.id);
  if (!enrollment) return res.status(403).json({ error: 'Enroll in this course before completing lessons.' });
  if (!enrollment.completedLessonIds.includes(lesson.id)) {
    enrollment.completedLessonIds.push(lesson.id);
    enrollment.activity = enrollment.activity || [];
    enrollment.activity.push({ type: 'lesson', text: `Completed “${lesson.title}”`, at: now() });
  }
  const progress = progressFor(db, req.user.id, course);
  writeDb(db);
  res.json({ progress, completedLessonIds: enrollment.completedLessonIds });
});

app.post('/api/courses/:courseId/quiz', auth, (req, res) => {
  const db = req.db;
  const course = db.courses.find(c => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const enrollment = db.enrollments.find(e => e.userId === req.user.id && e.courseId === course.id);
  if (!enrollment) return res.status(403).json({ error: 'Enroll in the course before taking its quiz.' });
  const answers = req.body.answers || {};
  let correct = 0;
  course.quiz.forEach(q => { if (Number(answers[q.id]) === q.answer) correct++; });
  const total = course.quiz.length;
  const percent = total ? Math.round(correct / total * 100) : 0;
  const passed = percent >= course.passPercent;
  enrollment.quizAttempts = enrollment.quizAttempts || [];
  enrollment.quizAttempts.push({ score: correct, total, percent, passed, at: now() });
  enrollment.quizBestScore = Math.max(enrollment.quizBestScore || 0, percent);
  enrollment.activity = enrollment.activity || [];
  enrollment.activity.push({ type: 'quiz', text: `${course.title} quiz: ${percent}%`, at: now() });
  const progress = progressFor(db, req.user.id, course);
  if (passed && progress === 100 && !enrollment.certificateIssuedAt) {
    enrollment.certificateIssuedAt = now();
    enrollment.certificateId = `CP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    enrollment.activity.push({ type: 'certificate', text: `Certificate earned for ${course.title}`, at: now() });
  }
  writeDb(db);
  res.json({ score: correct, total, percent, passed, passPercent: course.passPercent, certificateIssuedAt: enrollment.certificateIssuedAt, certificateId: enrollment.certificateId || null });
});

app.get('/api/certificates', auth, (req, res) => {
  const db = req.db;
  const certificates = db.enrollments.filter(e => e.userId === req.user.id && e.certificateIssuedAt).map(e => {
    const course = db.courses.find(c => c.id === e.courseId);
    return { certificateId: e.certificateId, issuedAt: e.certificateIssuedAt, courseId: e.courseId, courseTitle: course?.title || 'Course', studentName: req.user.name, instructor: db.users.find(u => u.id === course?.instructorId)?.name || 'CoursePilot Instructor' };
  });
  res.json({ certificates });
});

app.get('/api/certificates/:courseId', auth, (req, res) => {
  const db = req.db;
  const enrollment = db.enrollments.find(e => e.userId === req.user.id && e.courseId === req.params.courseId && e.certificateIssuedAt);
  if (!enrollment) return res.status(404).json({ error: 'Certificate not available yet.' });
  const course = db.courses.find(c => c.id === enrollment.courseId);
  const instructor = db.users.find(u => u.id === course.instructorId);
  res.json({ certificate: { certificateId: enrollment.certificateId, studentName: req.user.name, courseTitle: course.title, issuedAt: enrollment.certificateIssuedAt, instructor: instructor?.name || 'CoursePilot Instructor' } });
});

app.get('/api/instructor/dashboard', auth, requireRole('instructor','admin'), (req, res) => {
  const db = req.db;
  const owned = req.user.role === 'admin' ? db.courses : db.courses.filter(c => c.instructorId === req.user.id);
  const courseIds = new Set(owned.map(c => c.id));
  const enrollments = db.enrollments.filter(e => courseIds.has(e.courseId));
  res.json({
    stats: { courses: owned.length, learners: new Set(enrollments.map(e => e.userId)).size, enrollments: enrollments.length, certificates: enrollments.filter(e => e.certificateIssuedAt).length },
    courses: owned.map(c => ({ ...courseView(db, c, null), enrollments: enrollments.filter(e => e.courseId === c.id).length }))
  });
});

app.post('/api/instructor/courses', auth, requireRole('instructor','admin'), (req, res) => {
  const { title='', category='Development', level='Beginner', description='', duration='6 weeks' } = req.body;
  if (title.trim().length < 4 || description.trim().length < 20) return res.status(400).json({ error: 'Add a clear title and a description of at least 20 characters.' });
  const course = { id: id('course'), title: title.trim(), category, level, description: description.trim(), duration, rating: 5, students: 0, price: 0, skills: [], cover: 'images/courses/cs201.svg', instructorId: req.user.id, published: true, passPercent: 70, lessons: [], quiz: [], createdAt: now() };
  req.db.courses.push(course);
  writeDb(req.db);
  res.status(201).json({ course });
});

app.post('/api/instructor/courses/:courseId/lessons', auth, requireRole('instructor','admin'), (req, res) => {
  const course = req.db.courses.find(c => c.id === req.params.courseId && (req.user.role === 'admin' || c.instructorId === req.user.id));
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const { title='', duration='12 min', content='' } = req.body;
  if (title.trim().length < 3 || content.trim().length < 10) return res.status(400).json({ error: 'Add a lesson title and useful lesson content.' });
  const lesson = { id: id('lesson'), title: title.trim(), duration, content: content.trim() };
  course.lessons.push(lesson);
  writeDb(req.db);
  res.status(201).json({ lesson });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'CoursePilot LMS API', time: now() }));

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`CoursePilot LMS running at http://localhost:${PORT}`));
