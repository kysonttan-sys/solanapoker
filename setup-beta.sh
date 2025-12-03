#!/bin/bash
# SOLPOKER X - Beta Testing Quick Start Script

echo "🚀 SOLPOKER X - Beta Testing Setup"
echo "===================================="

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

echo "✅ Node.js found: $(node -v)"

# Setup Backend
echo ""
echo "📦 Setting up Backend Server..."
cd server
if [ -d "node_modules" ]; then
    echo "✅ Backend dependencies already installed"
else
    npm install --silent
fi

# Setup Database if not exists
if [ ! -f "prisma/dev.db" ]; then
    echo "🗄️  Initializing database..."
    npm run db:push --silent
    npm run db:seed
    echo "✅ Database ready"
else
    echo "✅ Database already exists"
fi

cd ..

# Setup Frontend
echo ""
echo "🎨 Setting up Frontend..."
if [ -d "node_modules" ]; then
    echo "✅ Frontend dependencies already installed"
else
    npm install --silent
fi

echo ""
echo "===================================="
echo "✅ Setup Complete!"
echo ""
echo "🎮 To start beta testing:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd server && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo "===================================="
