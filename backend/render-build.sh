#!/bin/bash
# Render.com Build Script for Backend
# Runs during the BUILD phase — no database access at this stage.
# Migrations are handled at startup via the startCommand in render.yaml.

set -e

echo "==> Starting backend build..."

python --version
pip --version

echo "==> Upgrading pip..."
pip install --upgrade pip --quiet

echo "==> Installing dependencies..."
pip install -r requirements.txt --quiet

echo "==> Build complete."
