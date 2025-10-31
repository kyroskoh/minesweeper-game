# Quick Start: PostgreSQL for High Availability

This is a quick reference for setting up PostgreSQL mode. For full documentation, see [POSTGRESQL_HA_SETUP.md](POSTGRESQL_HA_SETUP.md).

## 🚀 Quick Setup (5 minutes)

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:** Download from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE minesweeper;
CREATE USER minesweeper_user WITH ENCRYPTED PASSWORD 'change_this_password';
GRANT ALL PRIVILEGES ON DATABASE minesweeper TO minesweeper_user;
\q
```

### 3. Configure Environment

```bash
# Copy example file
cp .env.example .env

# Edit .env and add:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=minesweeper
POSTGRES_USER=minesweeper_user
POSTGRES_PASSWORD=change_this_password
```

### 4. Migrate Existing Data (Optional)

```bash
npm run migrate-to-postgres
```

### 5. Start Server

```bash
npm run start:postgres
```

Visit http://localhost:3030 🎉

---

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run with SQLite (original) |
| `npm run start:postgres` | Run with PostgreSQL (HA mode) |
| `npm run migrate-to-postgres` | Migrate SQLite data to PostgreSQL |

---

## 🌐 Multi-Server Deployment

### Setup on Server 1:
```bash
git clone <your-repo>
cd minesweeper-game
npm install

# Configure .env with PostgreSQL server IP
nano .env

npm run start:postgres
```

### Setup on Server 2:
```bash
# Same steps - both servers connect to same PostgreSQL instance
```

### Load Balancer:
Point both servers to your load balancer (Nginx, HAProxy, etc.)

---

## ⚠️ Troubleshooting

**Can't connect to PostgreSQL?**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U minesweeper_user -d minesweeper
```

**Migration errors?**
```bash
# Re-run migration (safe to run multiple times)
npm run migrate-to-postgres
```

**Port already in use?**
```bash
# Change PORT in .env file
PORT=3031
```

---

## 🔒 Production Checklist

- [ ] Use strong PostgreSQL password
- [ ] Enable SSL (`POSTGRES_SSL=true`)
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Use managed database service (AWS RDS, DigitalOcean, etc.)
- [ ] Set up monitoring
- [ ] Test failover scenarios

---

## 📚 Full Documentation

See [POSTGRESQL_HA_SETUP.md](POSTGRESQL_HA_SETUP.md) for:
- Detailed installation instructions
- Security best practices
- Backup and recovery
- Performance tuning
- Load balancer configuration
- Troubleshooting guide

---

## 💡 When to Use PostgreSQL vs SQLite

**Use SQLite (default) when:**
- ✅ Single server deployment
- ✅ Low to moderate traffic
- ✅ Development/testing
- ✅ Simple setup needed

**Use PostgreSQL (HA mode) when:**
- ✅ Multiple server deployment
- ✅ High availability required
- ✅ High traffic/concurrent users
- ✅ Production environment
- ✅ Need advanced database features

---

Need help? Check the full guide: [POSTGRESQL_HA_SETUP.md](POSTGRESQL_HA_SETUP.md)

