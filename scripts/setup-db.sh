#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Scope - Database Setup Script
# ============================================================
# Prerequisites:
#   1. A Neon project at https://neon.tech (free tier works)
#   2. Copy the connection strings into your .env file:
#        DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
#        DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
#      (Neon provides both pooled and direct URLs - use pooled for DATABASE_URL)
#
# Usage:
#   chmod +x scripts/setup-db.sh
#   ./scripts/setup-db.sh
# ============================================================

echo ""
echo "========================================="
echo "  Scope - Database Setup"
echo "========================================="
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "ERROR: .env file not found."
    echo ""
    echo "Create one from the example:"
    echo "  cp .env.example .env"
    echo ""
    echo "Then fill in your DATABASE_URL from Neon dashboard."
    exit 1
fi

# Check DATABASE_URL is set
source .env 2>/dev/null || true
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL is not set in .env"
    echo ""
    echo "Get your connection string from https://console.neon.tech"
    echo "and add it to .env as:"
    echo '  DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"'
    exit 1
fi

echo "[1/3] Generating Prisma client..."
npx prisma generate

echo ""
echo "[2/3] Pushing schema to database..."
npx prisma db push

echo ""
echo "[3/3] Verifying tables..."
npx prisma db pull --print 2>/dev/null | head -5

echo ""
echo "========================================="
echo "  Database setup complete!"
echo "========================================="
echo ""
echo "Tables created:"
echo "  - User        (auth accounts)"
echo "  - Account     (OAuth providers)"
echo "  - Session     (login sessions)"
echo "  - Project     (your scope data)"
echo "  - VerificationToken"
echo ""
echo "Next steps:"
echo "  1. Set up Google OAuth at https://console.cloud.google.com/apis/credentials"
echo "  2. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env"
echo "  3. Add NEXTAUTH_SECRET (run: openssl rand -base64 32)"
echo "  4. Add NEXTAUTH_URL=http://localhost:3000 (or your Vercel URL)"
echo "  5. Run: npm run dev"
echo ""
