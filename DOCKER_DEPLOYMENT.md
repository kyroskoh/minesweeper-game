# Docker Deployment Guide

Complete guide for deploying Minesweeper with Docker across multiple servers for High Availability.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Options](#architecture-options)
3. [Prerequisites](#prerequisites)
4. [Deployment Scenarios](#deployment-scenarios)
5. [Configuration](#configuration)
6. [Deployment Steps](#deployment-steps)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Quick Start

### Local Development (Full Stack)
```bash
# Copy example environment
cp .env.docker.example .env

# Start everything (app + database)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Visit http://localhost:3030 🎉

---

## Architecture Options

### Option 1: All-in-One (Development)
```
┌──────────────────────────┐
│   Docker Host            │
│  ┌──────┐  ┌──────────┐ │
│  │ App  │─→│PostgreSQL│ │
│  └──────┘  └──────────┘ │
└──────────────────────────┘
```
**Use:** Local development, testing
**Command:** `docker-compose up -d`

### Option 2: Separate DB + Multiple App Servers (HA Production)
```
┌────────────┐     ┌────────────┐
│  Server 1  │     │  Server 2  │
│  ┌──────┐  │     │  ┌──────┐  │
│  │ App  │  │     │  │ App  │  │
│  └───┬──┘  │     │  └───┬──┘  │
└──────┼─────┘     └──────┼─────┘
       │                  │
       └────────┬─────────┘
                │
         ┌──────▼──────┐
         │  DB Server  │
         │┌───────────┐│
         ││PostgreSQL ││
         │└───────────┘│
         └─────────────┘
```
**Use:** Production HA deployment
**Commands:** See [Deployment Steps](#deployment-steps)

---

## Prerequisites

### On All Servers

**1. Install Docker:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Verify
docker --version
```

**2. Install Docker Compose:**
```bash
# Ubuntu/Debian
sudo apt install docker-compose

# Or latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

**3. Clone Repository:**
```bash
git clone <your-repo-url>
cd minesweeper-game
```

---

## Deployment Scenarios

### Scenario A: Local Testing

**Full stack on one machine:**

```bash
# 1. Configure environment
cp .env.docker.example .env
nano .env  # Update passwords

# 2. Start everything
docker-compose up -d

# 3. Check status
docker ps

# 4. View logs
docker-compose logs -f app

# 5. Stop
docker-compose down
```

### Scenario B: Production HA (3 Servers)

**Server Layout:**
- **DB Server**: PostgreSQL only
- **App Server 1**: Minesweeper app
- **App Server 2**: Minesweeper app

#### DB Server Setup

```bash
# 1. Configure environment
cp .env.docker.example .env
nano .env  # Set STRONG password

# Example .env:
POSTGRES_DB=minesweeper
POSTGRES_USER=minesweeper_user
POSTGRES_PASSWORD=super-secure-password-here
POSTGRES_PORT=5432

# 2. Deploy PostgreSQL
chmod +x deploy/deploy-db.sh
./deploy/deploy-db.sh

# 3. Configure firewall
sudo ufw allow 5432/tcp
sudo ufw enable

# 4. Get server IP
hostname -I
# Example output: 10.0.1.100

# 5. Migrate data (if you have existing SQLite data)
npm install  # Install dependencies first
npm run migrate-to-postgres
```

#### App Server 1 Setup

```bash
# 1. Configure environment
cp .env.server1.example .env.server1
nano .env.server1

# Update these values:
POSTGRES_HOST=10.0.1.100  # DB server IP
POSTGRES_PASSWORD=super-secure-password-here  # Same as DB
DAILY_SEED_SALT=your-secret-salt-change-this  # Keep same across all servers

# 2. Deploy app
chmod +x deploy/deploy-server1.sh
./deploy/deploy-server1.sh

# 3. Configure firewall
sudo ufw allow 3030/tcp
sudo ufw enable

# 4. Test
curl http://localhost:3030/api/leaderboard
```

#### App Server 2 Setup

```bash
# 1. Configure environment
cp .env.server2.example .env.server2
nano .env.server2

# Update with SAME values as Server 1:
POSTGRES_HOST=10.0.1.100  # Same DB server
POSTGRES_PASSWORD=super-secure-password-here  # MUST match
DAILY_SEED_SALT=your-secret-salt-change-this  # MUST match Server 1

# 2. Deploy app
chmod +x deploy/deploy-server2.sh
./deploy/deploy-server2.sh

# 3. Configure firewall
sudo ufw allow 3030/tcp
sudo ufw enable

# 4. Test
curl http://localhost:3030/api/leaderboard
```

### Scenario C: Using Managed Database

**Use AWS RDS, DigitalOcean, or other managed PostgreSQL:**

```bash
# Server 1 & 2 .env configuration:
POSTGRES_HOST=your-managed-db.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=minesweeper
POSTGRES_USER=minesweeper_user
POSTGRES_PASSWORD=your-managed-db-password
POSTGRES_SSL=true  # Important for managed databases!

# Deploy apps only (no DB server needed)
./deploy/deploy-server1.sh  # On Server 1
./deploy/deploy-server2.sh  # On Server 2
```

---

## Configuration

### Environment Files

| File | Purpose | Location |
|------|---------|----------|
| `.env.docker.example` | Docker Compose template | Copy to `.env` |
| `.env.server1.example` | Server 1 config template | Copy to `.env.server1` |
| `.env.server2.example` | Server 2 config template | Copy to `.env.server2` |

**Important:** 
- ✅ `.env*` files are in `.gitignore` (protected)
- ❌ Never commit `.env` files to git
- ✅ `DAILY_SEED_SALT` must be IDENTICAL on both servers

### Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Full stack (app + DB) for local dev |
| `docker-compose.db-only.yml` | PostgreSQL only for dedicated DB server |
| `deploy/docker-compose.server1.yml` | App only for Server 1 |
| `deploy/docker-compose.server2.yml` | App only for Server 2 |

---

## Deployment Steps

### Step 1: Prepare Configuration

**On your local machine:**
```bash
# Create actual .env files from examples
cp .env.server1.example .env.server1
cp .env.server2.example .env.server2
cp .env.docker.example .env

# Edit each file with real values
nano .env.server1
nano .env.server2
nano .env

# NEVER commit these files!
git status  # Should not show .env files
```

### Step 2: Deploy Database Server

**On DB Server (e.g., 10.0.1.100):**
```bash
# Upload code
git clone <repo>
cd minesweeper-game

# Copy your .env (with real DB password)
# Upload via scp or create manually

# Deploy
chmod +x deploy/deploy-db.sh
./deploy/deploy-db.sh

# Verify
docker ps | grep postgres
docker logs minesweeper-postgres
```

### Step 3: Migrate Data (Optional)

**If you have existing SQLite data:**
```bash
# On DB server or any machine with access to both old DB and new PostgreSQL
npm install
npm run migrate-to-postgres

# This transfers:
# - leaderboard.db → PostgreSQL
# - historical_daily/*.db → PostgreSQL
```

### Step 4: Deploy App Server 1

**On App Server 1 (e.g., 10.0.1.101):**
```bash
git clone <repo>
cd minesweeper-game

# Copy your .env.server1
# Make sure POSTGRES_HOST points to DB server IP

chmod +x deploy/deploy-server1.sh
./deploy/deploy-server1.sh

# Test
curl http://localhost:3030/api/leaderboard
```

### Step 5: Deploy App Server 2

**On App Server 2 (e.g., 10.0.1.102):**
```bash
git clone <repo>
cd minesweeper-game

# Copy your .env.server2
# Make sure POSTGRES_HOST points to SAME DB server

chmod +x deploy/deploy-server2.sh
./deploy/deploy-server2.sh

# Test
curl http://localhost:3030/api/leaderboard
```

### Step 6: Set Up Load Balancer

**Install Nginx on a separate server or use cloud load balancer:**

```nginx
# /etc/nginx/sites-available/minesweeper

upstream minesweeper_backend {
    server 10.0.1.101:3030 max_fails=3 fail_timeout=30s;
    server 10.0.1.102:3030 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name minesweeper.example.com;
    
    location / {
        proxy_pass http://minesweeper_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Health check
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/minesweeper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: SSL Certificate (Production)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d minesweeper.example.com

# Auto-renewal is set up automatically
```

---

## Docker Commands Reference

### View Status
```bash
# All containers
docker ps

# Specific service
docker ps | grep minesweeper

# Resource usage
docker stats
```

### View Logs
```bash
# Full stack
docker-compose logs -f

# App only
docker-compose logs -f app

# PostgreSQL only
docker-compose logs -f postgres

# Last 100 lines
docker logs --tail 100 minesweeper-app-server1
```

### Restart Services
```bash
# Full stack
docker-compose restart

# App only
docker-compose restart app

# PostgreSQL only
docker-compose restart postgres

# Using specific compose file
docker-compose -f deploy/docker-compose.server1.yml restart
```

### Update Deployment
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d

# Or use deployment script
./deploy/deploy-server1.sh
```

### Database Backup
```bash
# Backup from Docker container
docker exec minesweeper-postgres pg_dump -U minesweeper_user minesweeper > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i minesweeper-postgres psql -U minesweeper_user minesweeper < backup_20251031.sql

# Backup with Docker volume
docker run --rm -v minesweeper_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

### Clean Up
```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: Deletes data!)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Full cleanup
docker system prune -a
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# 1. Port already in use
sudo lsof -i :3030
sudo kill -9 <PID>

# 2. Missing .env file
ls -la .env*

# 3. Database not ready
docker-compose logs postgres
```

### Can't Connect to Database

```bash
# Test from app container
docker exec -it minesweeper-app-server1 sh
nc -zv postgres 5432

# Test from host
telnet <DB_SERVER_IP> 5432

# Check firewall
sudo ufw status

# Check PostgreSQL logs
docker logs minesweeper-postgres
```

### App Returns 500 Error

```bash
# Check app logs
docker logs minesweeper-app-server1

# Check database connection
docker exec minesweeper-app-server1 env | grep POSTGRES

# Restart app
docker-compose restart app
```

### Health Check Failing

```bash
# Manual health check
curl http://localhost:3030/api/leaderboard

# Check container health
docker inspect minesweeper-app-server1 | grep -A 10 Health

# Restart
docker-compose restart app
```

---

## Maintenance

### Regular Updates

```bash
# Update code
git pull

# Rebuild
docker-compose build

# Rolling restart (zero downtime)
# Server 1: 
docker-compose -f deploy/docker-compose.server1.yml up -d

# Wait 30s, then Server 2:
docker-compose -f deploy/docker-compose.server2.yml up -d
```

### Monitoring

```bash
# Resource usage
docker stats

# Logs
docker-compose logs -f --tail=50

# Health status
docker inspect minesweeper-app-server1 | grep -A 5 Health
```

### Database Maintenance

```bash
# Connect to PostgreSQL
docker exec -it minesweeper-postgres psql -U minesweeper_user -d minesweeper

# Vacuum database
VACUUM ANALYZE;

# Check table sizes
SELECT 
    schemaname, 
    tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public';

# Exit
\q
```

---

## Security Checklist

- [ ] Use strong passwords in `.env` files
- [ ] Enable `POSTGRES_SSL=true` in production
- [ ] Configure firewall rules (ufw/iptables)
- [ ] Use SSL certificates (Let's Encrypt)
- [ ] Regular security updates: `docker-compose pull && docker-compose up -d`
- [ ] Backup database regularly
- [ ] Monitor logs for suspicious activity
- [ ] Use non-root user in Dockerfile (already configured)
- [ ] Limit exposed ports (only 3030 for app, 5432 for DB)
- [ ] Use Docker secrets for production (instead of .env)

---

## Performance Tuning

### PostgreSQL Configuration

Edit `docker-compose.db-only.yml` to tune PostgreSQL:

```yaml
command: >
  postgres
  -c max_connections=200
  -c shared_buffers=256MB
  -c effective_cache_size=1GB
```

### App Scaling

Add more app servers:

```bash
# Server 3, 4, 5... (follow same pattern)
cp .env.server2.example .env.server3
# Configure and deploy
```

Update load balancer:
```nginx
upstream minesweeper_backend {
    server 10.0.1.101:3030;
    server 10.0.1.102:3030;
    server 10.0.1.103:3030;
    # Add more as needed
}
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start full stack | `docker-compose up -d` |
| Stop full stack | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Deploy DB only | `./deploy/deploy-db.sh` |
| Deploy Server 1 | `./deploy/deploy-server1.sh` |
| Deploy Server 2 | `./deploy/deploy-server2.sh` |
| Check status | `docker ps` |
| Restart app | `docker-compose restart app` |
| Database backup | `docker exec minesweeper-postgres pg_dump ...` |
| Update code | `git pull && docker-compose up -d --build` |

---

## Support

- **Docker issues**: Check logs with `docker-compose logs`
- **Network issues**: Verify firewall and connectivity
- **Database issues**: Check PostgreSQL logs
- **General deployment**: See [POSTGRESQL_HA_SETUP.md](POSTGRESQL_HA_SETUP.md)

---

Happy Deploying! 🚀🐳

