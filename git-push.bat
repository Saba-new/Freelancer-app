@echo off
cd /d "c:\Users\SABARISH\Desktop\Freelancer app"

echo === Git Push Helper ===
echo.

echo [1/4] Checking status...
git status --short
echo.

echo [2/4] Adding all changes...
git add .
echo.

echo [3/4] Committing...
set /p message="Enter commit message (or press Enter for default): "
if "%message%"=="" set message=Update: Save progress
git commit -m "%message%"
echo.

echo [4/4] Pulling and pushing...
set GIT_MERGE_AUTOEDIT=no
git pull origin main --no-edit
git push origin main

echo.
echo === Complete! ===
pause
