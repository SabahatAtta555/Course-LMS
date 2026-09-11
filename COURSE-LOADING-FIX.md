# Course homepage loading fix

The public homepage previously depended entirely on `GET /api/courses`. If the site was opened with a static server, Live Server, or GitHub Pages, the API endpoint did not exist and the Popular Courses section displayed a loading/server message.

## Fix

- Added `public/js/public-courses.js` containing sanitized public metadata for all 32 courses.
- The homepage uses this bundled catalog as its reliable default.
- When the Node/Express backend is available, the homepage replaces the fallback data with the live `/api/courses` response.
- No quiz answer keys, passwords, sessions, enrollments, or other private backend data are included in the public fallback file.
- Static homepage previews can now show the course cards without requiring the backend server.

Full LMS actions such as registration, login, enrollment, progress, quizzes, certificates, and instructor tools still require the Node/Express server.
