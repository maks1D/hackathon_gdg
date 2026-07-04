#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== GDG Hackathon Setup Script (Linux/macOS) ==="

# 1. Verify Node.js installation
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js (v20+ recommended)."
  exit 1
fi

# 2. Install dependencies
echo "Installing dependencies..."
npm install

# 3. Create .env file if it doesn't exist
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
  else
    echo "Warning: .env.example not found. Please create a .env file manually."
  fi
else
  echo ".env file already exists."
fi

# 4. Generate Prisma client & run database migrations
echo "Setting up SQLite database..."
npx prisma migrate dev

echo "=== Setup complete! Run 'npm start' to boot up the applications. ==="
