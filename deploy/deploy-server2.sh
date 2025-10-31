#!/bin/bash
# Deployment script for Server 2
# Usage: ./deploy/deploy-server2.sh

set -e  # Exit on error

echo "🚀 Deploying Minesweeper to Server 2..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env.server2 exists
if [ ! -f ".env.server2" ]; then
    echo -e "${RED}❌ Error: .env.server2 not found${NC}"
    echo -e "${YELLOW}Please copy .env.server2.example to .env.server2 and configure it${NC}"
    exit 1
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

# Pull latest code (if in git repo)
if [ -d ".git" ]; then
    echo "📦 Pulling latest code..."
    git pull
fi

# Build Docker image
echo "🔨 Building Docker image..."
docker-compose -f deploy/docker-compose.server2.yml build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f deploy/docker-compose.server2.yml down

# Start new containers
echo "▶️  Starting containers..."
docker-compose -f deploy/docker-compose.server2.yml up -d

# Wait for app to be healthy
echo "⏳ Waiting for app to be healthy..."
sleep 5

# Check container status
if docker ps | grep -q "minesweeper-app-server2"; then
    echo -e "${GREEN}✅ Server 2 deployed successfully!${NC}"
    echo ""
    echo "📊 Container Status:"
    docker ps | grep minesweeper
    echo ""
    echo "📝 Logs: docker-compose -f deploy/docker-compose.server2.yml logs -f"
    echo "🛑 Stop: docker-compose -f deploy/docker-compose.server2.yml down"
else
    echo -e "${RED}❌ Deployment failed. Check logs:${NC}"
    docker-compose -f deploy/docker-compose.server2.yml logs
    exit 1
fi
