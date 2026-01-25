# Git Push Script - Commit and Push All Changes
# Usage: Run this script whenever you want to push changes

param(
    [Parameter(Mandatory=$false)]
    [string]$CommitMessage = "Update: Save progress"
)

Write-Host "=== Git Commit and Push Script ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
Set-Location "c:\Users\SABARISH\Desktop\Freelancer app"

# Check git status
Write-Host "Checking for changes..." -ForegroundColor Yellow
git status --short

# Add all changes
Write-Host ""
Write-Host "Staging all changes..." -ForegroundColor Yellow
git add .

# Commit changes
Write-Host ""
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m $CommitMessage

# Pull remote changes (with merge)
Write-Host ""
Write-Host "Pulling remote changes..." -ForegroundColor Yellow
$env:GIT_MERGE_AUTOEDIT = "no"
git pull origin main --no-edit

# Push to remote
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "✅ Done! All changes pushed to GitHub." -ForegroundColor Green
