#!/bin/bash
# Deployment script for PostgreSQL Database Server
# Usage: ./deploy/deploy-db.sh

set -e  # Exit on error

echo "🐘 Deploying PostgreSQL Database..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env found, using .env.docker.example${NC}"
    if [ -f ".env.docker.example" ]; then
        cp .env.docker.example .env
        echo -e "${YELLOW}⚠️  Please update .env with secure passwords!${NC}"
    else
        echo -e "${RED}❌ Error: .env.docker.example not found${NC}"
        exit 1
    fi
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Start PostgreSQL
echo "▶️  Starting PostgreSQL..."
docker-compose -f docker-compose.db-only.yml up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is running
if docker ps | grep -q "minesweeper-postgres"; then
    echo -e "${GREEN}✅ PostgreSQL deployed successfully!${NC}"
    echo ""
    echo "📊 Container Status:"
    docker ps | grep postgres
    echo ""
    echo "🔌 Connection Details:"
    echo "   Host: localhost (or your server IP)"
    echo "   Port: 5432"
    echo "   Database: minesweeper"
    echo "   User: minesweeper_user"
    echo ""
    echo "📝 Logs: docker-compose -f docker-compose.db-only.yml logs -f"
    echo "🛑 Stop: docker-compose -f docker-compose.db-only.yml down"
    echo ""
    echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
    echo "   1. Configure firewall to allow port 5432"
    echo "   2. Update .env.server1 and .env.server2 with this DB host"
    echo "   3. Run migration: npm run migrate-to-postgres"
else
    echo -e "${RED}❌ Deployment failed. Check logs:${NC}"
    docker-compose -f docker-compose.db-only.yml logs
    exit 1
fi
