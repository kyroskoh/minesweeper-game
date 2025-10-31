# Deployment Quick Reference

Quick cheat sheet for deploying Minesweeper with Docker.

## 📦 What You Have

### Docker Files
- `Dockerfile` - App container image
- `docker-compose.yml` - Full stack (dev)
- `docker-compose.db-only.yml` - Database only
- `deploy/docker-compose.server1.yml` - App server 1
- `deploy/docker-compose.server2.yml` - App server 2

### Configuration Templates
- `.env.docker.example` → `.env` (Docker Compose)
- `.env.server1.example` → `.env.server1` (Server 1)
- `.env.server2.example` → `.env.server2` (Server 2)

### Deployment Scripts
- `deploy/deploy-db.sh` - Deploy database
- `deploy/deploy-server1.sh` - Deploy app server 1
- `deploy/deploy-server2.sh` - Deploy app server 2

---

## 🚀 Quick Start

### Local Testing (One Command)

```bash
cp .env.docker.example .env
docker-compose up -d
```
Visit http://localhost:3030 ✅

### Production HA (3 Servers)

**Step 1: DB Server**
```bash
cp .env.docker.example .env
nano .env  # Set secure password
./deploy/deploy-db.sh
npm run migrate-to-postgres  # If migrating data
```

**Step 2: App Server 1**
```bash
cp .env.server1.example .env.server1
nano .env.server1  # Set DB host/password
./deploy/deploy-server1.sh
```

**Step 3: App Server 2**
```bash
cp .env.server2.example .env.server2
nano .env.server2  # Same DB host/password as Server 1!
./deploy/deploy-server2.sh
```

**Step 4: Load Balancer**
- Point to both app servers
- See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for Nginx config

---

## 🔧 Common Commands

### Check Status
```bash
docker ps                    # All containers
docker ps | grep minesweeper # This app only
docker-compose logs -f       # Live logs
```

### Restart
```bash
docker-compose restart       # Full stack
docker-compose restart app   # App only
./deploy/deploy-server1.sh   # Redeploy Server 1
```

### Stop
```bash
docker-compose down          # Stop all
docker stop minesweeper-app-server1  # Stop specific
```

### Update Code
```bash
git pull
docker-compose build
docker-compose up -d
```

### Backup Database
```bash
docker exec minesweeper-postgres pg_dump -U minesweeper_user minesweeper > backup.sql
```

---

## ⚙️ Configuration Checklist

### Before Deploying

- [ ] Copy `.env.*.example` to `.env.*` files
- [ ] Update `POSTGRES_PASSWORD` (use strong password!)
- [ ] Update `POSTGRES_HOST` (DB server IP/hostname)
- [ ] Ensure `DAILY_SEED_SALT` is IDENTICAL on all app servers
- [ ] Configure firewall (3030 for app, 5432 for DB)
- [ ] Verify `.env*` files are in `.gitignore` ✅

### Environment Variables

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `POSTGRES_HOST` | ✅ | `10.0.1.100` | DB server address |
| `POSTGRES_PORT` | ✅ | `5432` | DB port |
| `POSTGRES_DB` | ✅ | `minesweeper` | Database name |
| `POSTGRES_USER` | ✅ | `minesweeper_user` | DB user |
| `POSTGRES_PASSWORD` | ✅ | `secure-pass` | DB password (keep secret!) |
| `DAILY_SEED_SALT` | ✅ | `random-string` | Same across all servers! |
| `PORT` | ⚠️ | `3030` | App port (default 3030) |
| `POSTGRES_SSL` | ⚠️ | `true` | Enable for production |

---

## 🌐 Architecture

### Development
```
┌────────────────┐
│ docker-compose │
│  ┌───┐  ┌────┐ │
│  │App│→ │ DB │ │
│  └───┘  └────┘ │
└────────────────┘
```

### Production HA
```
Load Balancer
      ↓
┌─────┴─────┐
│           │
Server1   Server2
  App       App
   ↓         ↓
   └────┬────┘
        ↓
    DB Server
   PostgreSQL
```

---

## 🐛 Troubleshooting

### Container won't start
```bash
docker-compose logs app  # Check logs
docker ps -a             # See stopped containers
```

### Can't connect to database
```bash
# From app server
telnet <DB_IP> 5432

# Check firewall
sudo ufw status
sudo ufw allow 5432/tcp

# Test inside container
docker exec -it minesweeper-app-server1 sh
nc -zv $POSTGRES_HOST $POSTGRES_PORT
```

### App returns errors
```bash
docker logs minesweeper-app-server1 --tail 50
docker exec minesweeper-app-server1 env | grep POSTGRES
```

### Need to reset everything
```bash
docker-compose down -v  # ⚠️ Deletes data!
docker system prune -a  # Clean up
```

---

## 📚 Documentation

- **Quick Start**: You're reading it!
- **Full Docker Guide**: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- **PostgreSQL Setup**: [POSTGRESQL_HA_SETUP.md](POSTGRESQL_HA_SETUP.md)
- **Implementation Details**: [POSTGRESQL_IMPLEMENTATION_SUMMARY.md](POSTGRESQL_IMPLEMENTATION_SUMMARY.md)

---

## 🔒 Security Reminders

- ✅ `.env*` files are gitignored
- ✅ Use strong passwords
- ✅ Enable SSL in production (`POSTGRES_SSL=true`)
- ✅ Configure firewalls
- ✅ Regular backups
- ✅ Keep Docker images updated

---

## 💡 Tips

1. **Always test locally first** with `docker-compose up -d`
2. **Use same `DAILY_SEED_SALT`** on all servers (daily puzzles won't work otherwise)
3. **Keep database password secure** - never commit to git
4. **Monitor logs** with `docker-compose logs -f`
5. **Backup before updates** - `pg_dump` your database first

---

Need more details? Check [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for comprehensive guide!

