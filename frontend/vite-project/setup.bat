@echo off
REM CloudFarm Development Setup Script for Windows

echo.
echo 🌾 CloudFarm - Farm Management System Setup
echo ===========================================
echo.

REM Check if Node.js is installed
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version
echo ✅ npm version:
npm --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Dependencies installed successfully!
echo.
echo 🚀 Available commands:
echo    npm run dev      - Start development server
echo    npm run build    - Build for production
echo    npm run preview  - Preview production build
echo    npm run lint     - Run ESLint
echo.
echo 📖 For more information, see CLOUDFARM_README.md
echo.
echo To start development:
echo    npm run dev
echo.
pause
