#!/bin/bash
set -e

echo "Running database migrations..."
cd /app/packages/db
npx drizzle-kit push:pg || echo "Migration completed or tables exist"
cd /app

echo "Starting server..."
exec node apps/web/.output/server/index.mjs
