@echo off
cd /d "%~dp0"
echo Installing CoursePilot dependencies...
call npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Check your internet connection and confirm Node.js is installed.
  pause
  exit /b 1
)
echo.
echo Starting CoursePilot at http://localhost:3000
call npm start
pause
