#!/bin/bash

# Ekuinox Backend Setup Script
echo "🚀 Setting up Ekuinox Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (>=18.0.0)"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please update the .env file with your configuration"
else
    echo "✅ .env file already exists"
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads
echo "✅ Uploads directory created"

# Check if MongoDB is running (optional)
if command -v mongod &> /dev/null; then
    echo "🔍 Checking MongoDB status..."
    if pgrep mongod > /dev/null; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB is not running. You can:"
        echo "   1. Start MongoDB locally: sudo systemctl start mongod"
        echo "   2. Use MongoDB Atlas (update MONGODB_URI in .env)"
    fi
else
    echo "⚠️  MongoDB not found locally. You can:"
    echo "   1. Install MongoDB locally"
    echo "   2. Use MongoDB Atlas (update MONGODB_URI in .env)"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update .env with your configuration"
echo "   2. Ensure MongoDB is running or configure Atlas"
echo "   3. Start development server: npm run dev"
echo "   4. Initialize admin user: curl -X POST http://localhost:5000/api/admin/init"
echo ""
echo "🌐 Server will be available at: http://localhost:5000"
echo "📚 API documentation in README.md"