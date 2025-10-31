#!/bin/bash
# Deployment script for Host 1 (All-in-One: App + PostgreSQL + etcd)
# Usage: ./deploy/deploy-host1.sh

set -e  # Exit on error

echo "🚀 Deploying Minesweeper HA Stack to Host 1..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if .env.host1 exists
if [ ! -f ".env.host1" ]; then
    echo -e "${RED}❌ Error: .env.host1 not found${NC}"
    echo -e "${YELLOW}Please copy .env.host1.example to .env.host1 and configure it${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Load environment variables
set -a
source .env.host1
set +a

echo "📋 Configuration:"
echo "   HOST1_IP: ${HOST1_IP}"
echo "   HOST2_IP: ${HOST2_IP}"
echo "   Cluster: minesweeper-cluster"

# Pull latest code (if in git)
if [ -d ".git" ]; then
    echo "📦 Pulling latest code..."
    git pull || true
fi

# Build images
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.host1.yml build

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.host1.yml down || true

# Start services
echo "▶️  Starting services..."
docker-compose -f docker-compose.host1.yml up -d

# Wait for services
echo "⏳ Waiting for services to be healthy..."
sleep 15

# Check container status
if docker ps | grep -q "minesweeper.*host1"; then
    echo -e "${GREEN}✅ Host 1 deployed successfully!${NC}"
    echo ""
    echo "📊 Container Status:"
    docker ps | grep minesweeper | grep -E "(host1|postgres1|etcd[13]|haproxy1)"
    echo ""
    echo "🔍 Service Endpoints:"
    echo "   App: http://localhost:3030"
    echo "   PostgreSQL: localhost:5432"
    echo "   HAProxy: http://localhost:5000 (primary)"
    echo "   HAProxy Stats: http://localhost:7000"
    echo "   Patroni API: http://localhost:8008"
    echo ""
    echo "📝 Useful Commands:"
    echo "   Logs: docker-compose -f docker-compose.host1.yml logs -f"
    echo "   Status: curl http://localhost:8008/cluster | jq"
    echo "   Stop: docker-compose -f docker-compose.host1.yml down"
    echo ""
    echo -e "${YELLOW}⚠️  Next: Deploy Host 2 with ./deploy/deploy-host2.sh${NC}"
else
    echo -e "${RED}❌ Deployment failed. Check logs:${NC}"
    docker-compose -f docker-compose.host1.yml logs --tail=50
    exit 1
fi

