#!/bin/bash
set -e

echo "Running database migrations..."
cd /app/packages/db
npx drizzle-kit push:pg --force || echo "Migration may have issues, continuing..."
cd /app

echo "Starting server..."
exec node apps/web/.output/server/index.mjs
