#!/bin/bash
# Render.com Build Script for Frontend (Next.js)
# Render sets NODE_ENV=production by default, which skips devDependencies.
# We pass --production=false so TypeScript, ESLint, etc. are available for the build.

set -e

echo "==> Starting frontend build..."

node --version
npm --version

echo "==> Installing dependencies (including devDeps for build tools)..."
npm ci --production=false

echo "==> Building Next.js application..."
npm run build

echo "==> Build complete."
