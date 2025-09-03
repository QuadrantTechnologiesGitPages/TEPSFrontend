@echo off
echo ========================================
echo Recruitment App - Material UI Setup
echo ========================================

:: Clean up if exists
if exist recruitment-app-mui (
    echo Removing old installation...
    rmdir /s /q recruitment-app-mui
)

:: Create React app
echo Creating React app...
call npx create-react-app recruitment-app-mui

:: Navigate to project
cd recruitment-app-mui

:: Install Material-UI and dependencies
echo Installing Material-UI...
call npm install @mui/material @emotion/react @emotion/styled @mui/icons-material

:: Install additional packages
echo Installing additional packages...
call npm install axios fuse.js date-fns react-hot-toast

:: Create folder structure
echo Creating folder structure...
mkdir src\components
mkdir src\components\search
mkdir src\components\candidates
mkdir src\components\communication
mkdir src\components\common
mkdir src\hooks
mkdir src\utils
mkdir src\data
mkdir src\theme

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Run the following commands:
echo   cd recruitment-app-mui
echo   npm start
echo.
echo The app will open at http://localhost:3000
echo.
pause