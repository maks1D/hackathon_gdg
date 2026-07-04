# GDG Hackathon Setup Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "=== GDG Hackathon Setup Script (Windows PowerShell) ===" -ForegroundColor Cyan

# 1. Verify Node.js installation
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Error: Node.js is not installed. Please install Node.js (v20+ recommended)."
    Exit 1
}

# 2. Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Green
npm install

# 3. Create .env file if it doesn't exist
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Write-Host "Copying .env.example to .env..." -ForegroundColor Green
        Copy-Item .env.example .env
    } else {
        Write-Warning "Warning: .env.example not found. Please create a .env file manually."
    }
} else {
    Write-Host ".env file already exists." -ForegroundColor Yellow
}

# 4. Generate Prisma client & run database migrations
Write-Host "Setting up SQLite database..." -ForegroundColor Green
npx prisma migrate dev

Write-Host "=== Setup complete! Run 'npm start' to boot up the applications. ===" -ForegroundColor Cyan
