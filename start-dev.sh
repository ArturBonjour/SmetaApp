#!/bin/bash
# Quick start script for development

echo "🚀 Starting SmetaApp dev environment..."

# Start backend
echo "📦 Starting backend..."
cd backend
if [ ! -f "prisma/dev.db" ]; then
  echo "  Creating database..."
  node_modules/.bin/prisma db push
  node_modules/.bin/ts-node prisma/seed.ts
fi
npm run dev &
BACKEND_PID=$!

# Start frontend
echo "🎨 Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ SmetaApp started!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   Demo login: demo@smeta.app / demo123"
echo ""
echo "Press Ctrl+C to stop..."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
