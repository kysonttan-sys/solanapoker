# SOLPOKER X - Beta Testing Quick Start Script (Windows)

Write-Host "🚀 SOLPOKER X - Beta Testing Setup" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check if Node is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Setup Backend
Write-Host ""
Write-Host "📦 Setting up Backend Server..." -ForegroundColor Cyan

Push-Location server

if (Test-Path "node_modules") {
    Write-Host "✅ Backend dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install --silent
}

# Setup Database if not exists
$dbPath = "prisma/dev.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "🗄️  Initializing database..." -ForegroundColor Cyan
    npm run db:push --silent 2>$null
    npm run db:seed
    Write-Host "✅ Database ready" -ForegroundColor Green
} else {
    Write-Host "✅ Database already exists" -ForegroundColor Green
}

Pop-Location

# Setup Frontend
Write-Host ""
Write-Host "🎨 Setting up Frontend..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "✅ Frontend dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install --silent
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎮 To start beta testing:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor Cyan
Write-Host "  cd server && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:3000" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
