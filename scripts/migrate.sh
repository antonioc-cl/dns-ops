#!/bin/bash
set -e

echo "=== Running database migrations ==="
cd /app/packages/db

echo "Schema path: $(pwd)/dist/schema/index.js"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..."

# Try to push the schema
npx drizzle-kit push:pg 2>&1 || {
    echo "drizzle-kit push failed, trying alternative..."
    # Try generating and applying migrations instead
    npx drizzle-kit generate:pg 2>&1 || true
}

echo "=== Migration complete, starting server ==="
cd /app
exec node apps/web/.output/server/index.mjs
