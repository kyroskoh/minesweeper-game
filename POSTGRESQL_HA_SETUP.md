# PostgreSQL High Availability Setup Guide

This guide explains how to set up and run the Minesweeper game with PostgreSQL for high availability (HA) across multiple servers.

## 📋 Table of Contents

1. [Why PostgreSQL for HA?](#why-postgresql-for-ha)
2. [Prerequisites](#prerequisites)
3. [PostgreSQL Installation](#postgresql-installation)
4. [Initial Setup](#initial-setup)
5. [Migration from SQLite](#migration-from-sqlite)
6. [Running with PostgreSQL](#running-with-postgresql)
7. [Deploying to Multiple Servers](#deploying-to-multiple-servers)
8. [Troubleshooting](#troubleshooting)

---

## Why PostgreSQL for HA?

The original SQLite implementation stores data in local files, which doesn't work well across multiple servers. PostgreSQL provides:

✅ **Centralized Database**: Both servers connect to the same database  
✅ **Real-time Synchronization**: All writes are immediately visible to all servers  
✅ **ACID Guarantees**: Data consistency across all connections  
✅ **Scalability**: Can add read replicas for better performance  
✅ **High Availability**: Built-in replication and failover capabilities  

---

## Prerequisites

- **Node.js** (v14 or higher)
- **PostgreSQL** (v12 or higher)
- **Existing Minesweeper app** with SQLite data (optional - for migration)

---

## PostgreSQL Installation

### On Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### On Windows:
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the superuser password you set during installation

### On macOS:
```bash
# Using Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15
```

---

## Initial Setup

### 1. Create Database and User

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE DATABASE minesweeper;
CREATE USER minesweeper_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE minesweeper TO minesweeper_user;

# Exit PostgreSQL
\q
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and configure PostgreSQL credentials:
```env
PORT=3030

# PostgreSQL Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=minesweeper
POSTGRES_USER=minesweeper_user
POSTGRES_PASSWORD=your_secure_password_here

# Optional settings
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_SSL=false
```

**Important:** 
- Keep `.env` file **private** and never commit it to version control
- For production, use strong passwords
- Enable SSL in production (`POSTGRES_SSL=true`)

### 3. Install Dependencies

If you haven't already:
```bash
npm install
```

This will install the `pg` (PostgreSQL) package along with other dependencies.

---

## Migration from SQLite

If you have existing SQLite data, migrate it to PostgreSQL:

### Run the Migration Script

```bash
npm run migrate-to-postgres
```

This script will:
1. ✅ Test PostgreSQL connection
2. ✅ Create required tables and indexes
3. ✅ Migrate `leaderboard.db` to PostgreSQL
4. ✅ Migrate all historical daily databases from `historical_daily/` folder
5. ✅ Verify the migration with record counts

### Migration Output Example

```
🚀 Minesweeper SQLite → PostgreSQL Migration Tool

================================================

🔌 Testing PostgreSQL connection...
✅ PostgreSQL connection successful

📋 Creating PostgreSQL tables...
  ✅ Created leaderboard table
  ✅ Created daily_leaderboard table
  ✅ Created indexes

📦 Migrating main leaderboard database...
  📊 Found 150 records in SQLite database
  ✅ Successfully migrated 150 records to PostgreSQL

📅 Migrating historical daily databases...
  📊 Found 10 historical database files
  ✅ 2025-10-25: migrated 45 records
  ✅ 2025-10-26: migrated 38 records
  ...
  ✅ Total historical records migrated: 420

🔍 Verifying migration...
  📊 Leaderboard records: 150
  📊 Daily leaderboard records: 420

================================================
✅ Migration Complete!
```

### What Gets Migrated?

- ✅ All leaderboard scores (name, time, difficulty, date, is_daily, device_id)
- ✅ All historical daily puzzle scores
- ✅ Original timestamps preserved
- ✅ All indexes created for optimal performance

---

## Running with PostgreSQL

### Start the PostgreSQL-enabled Server

```bash
npm run start:postgres
```

Or for development:
```bash
npm run dev:postgres
```

You should see:
```
✅ PostgreSQL connected successfully
✅ Database tables initialized
🚀 Minesweeper server running on http://127.0.0.1:3030
🐘 Using PostgreSQL database
   Host: localhost
   Database: minesweeper
```

### Still Want to Use SQLite?

The original SQLite version is still available:
```bash
npm start
# or
npm run dev
```

Both versions can coexist - just use different npm commands.

---

## Deploying to Multiple Servers

### Architecture Overview

```
┌─────────────┐         ┌─────────────┐
│  Server 1   │         │  Server 2   │
│  (Node.js)  │         │  (Node.js)  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │    Both connect to    │
       └───────────┬───────────┘
                   │
            ┌──────▼──────┐
            │ PostgreSQL  │
            │  Database   │
            │  (Separate  │
            │   Server)   │
            └─────────────┘
```

### Step-by-Step Deployment

#### Option 1: Dedicated PostgreSQL Server

1. **Set up PostgreSQL on a separate server**
   ```bash
   # On database server
   sudo apt install postgresql
   
   # Configure PostgreSQL to accept remote connections
   sudo nano /etc/postgresql/15/main/postgresql.conf
   # Change: listen_addresses = '*'
   
   sudo nano /etc/postgresql/15/main/pg_hba.conf
   # Add: host    minesweeper    minesweeper_user    0.0.0.0/0    md5
   
   sudo systemctl restart postgresql
   ```

2. **Deploy app to Server 1**
   ```bash
   # On Server 1
   git clone <your-repo>
   cd minesweeper-game
   npm install
   
   # Configure .env
   nano .env
   # Set POSTGRES_HOST to database server IP
   # Set POSTGRES_SSL=true for production
   
   npm run start:postgres
   ```

3. **Deploy app to Server 2**
   ```bash
   # On Server 2 - same steps as Server 1
   # Both servers point to the same PostgreSQL server
   ```

4. **Set up load balancer**
   - Use Nginx, HAProxy, or cloud load balancer
   - Distribute traffic between Server 1 and Server 2
   - Health checks on `/api/leaderboard`

#### Option 2: Managed Database Services

Use a managed PostgreSQL service (recommended for production):

- **AWS RDS PostgreSQL**
- **DigitalOcean Managed Databases**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **Heroku Postgres**

Benefits:
- ✅ Automatic backups
- ✅ Built-in high availability
- ✅ Easy scaling
- ✅ Monitoring and alerts
- ✅ Automatic updates

Simply update `.env` with the connection details from your provider.

### Example Nginx Load Balancer Config

```nginx
upstream minesweeper_backend {
    server server1.example.com:3030;
    server server2.example.com:3030;
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
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Database Schema

### `leaderboard` Table
```sql
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    time INTEGER NOT NULL,              -- Time in seconds
    difficulty VARCHAR(50) NOT NULL,     -- Easy, Medium, Hard, etc.
    date TIMESTAMP NOT NULL,             -- When score was submitted
    is_daily BOOLEAN DEFAULT FALSE,      -- Is this a daily puzzle score?
    device_id VARCHAR(255),              -- Device identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_leaderboard_difficulty_time ON leaderboard(difficulty, time);
CREATE INDEX idx_leaderboard_is_daily ON leaderboard(is_daily);
```

### `daily_leaderboard` Table
```sql
CREATE TABLE daily_leaderboard (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    time INTEGER NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    date TIMESTAMP NOT NULL,             -- When score was submitted
    device_id VARCHAR(255),
    puzzle_date DATE NOT NULL,           -- Which daily puzzle (SGT date)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_daily_leaderboard_puzzle_date 
ON daily_leaderboard(puzzle_date, difficulty, time);
```

---

## Troubleshooting

### Connection Failed

**Error:** `PostgreSQL connection failed`

**Solutions:**
1. Check PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verify credentials in `.env` file

3. Test connection manually:
   ```bash
   psql -h localhost -U minesweeper_user -d minesweeper
   ```

4. Check PostgreSQL logs:
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-15-main.log
   ```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3030`

**Solutions:**
1. Change PORT in `.env` file
2. Or stop the other process:
   ```bash
   # Find process using port 3030
   lsof -ti:3030 | xargs kill
   ```

### Remote Connection Issues

**Error:** Can't connect from Server 1 to PostgreSQL server

**Solutions:**
1. Configure PostgreSQL to accept remote connections (see deployment section)

2. Open firewall port:
   ```bash
   sudo ufw allow 5432/tcp
   ```

3. Test connectivity:
   ```bash
   telnet <db-server-ip> 5432
   ```

4. For cloud servers, check security groups/firewall rules

### Migration Errors

**Error:** `Error migrating record`

**Solutions:**
1. Check data compatibility (strings too long, invalid dates)
2. Review migration logs for specific errors
3. Run migration again (it's safe to re-run)
4. Manually inspect problematic records in SQLite

### SSL Connection Issues

**Error:** `SSL connection failed`

**Solutions:**
1. For development, set `POSTGRES_SSL=false` in `.env`
2. For production with managed databases:
   - Download SSL certificate from provider
   - Update connection config to use certificate
   - Set `POSTGRES_SSL=true`

---

## Performance Tips

### 1. Connection Pooling
The app uses connection pooling by default. Adjust pool size:
```env
POSTGRES_MAX_CONNECTIONS=20
```

### 2. Add More Indexes
For specific query patterns, add custom indexes:
```sql
-- Index for fetching user's best scores
CREATE INDEX idx_leaderboard_device_time ON leaderboard(device_id, time);

-- Index for daily leaderboard queries
CREATE INDEX idx_daily_leaderboard_combined 
ON daily_leaderboard(puzzle_date, difficulty);
```

### 3. Query Optimization
Monitor slow queries:
```sql
-- Enable logging slow queries
ALTER DATABASE minesweeper SET log_min_duration_statement = 1000; -- 1 second
```

### 4. Read Replicas
For high traffic, set up PostgreSQL read replicas:
- Write operations → Primary database
- Read operations (leaderboards) → Read replicas

---

## Security Checklist

- [ ] Use strong passwords for PostgreSQL users
- [ ] Enable SSL for production (`POSTGRES_SSL=true`)
- [ ] Keep `.env` file private (add to `.gitignore`)
- [ ] Use managed database service for automatic security updates
- [ ] Restrict PostgreSQL access to specific IP addresses
- [ ] Regular database backups
- [ ] Use environment variables for sensitive data
- [ ] Enable firewall rules on database server
- [ ] Regularly update PostgreSQL and Node.js
- [ ] Monitor database access logs

---

## Backup and Recovery

### Create Backup
```bash
# Full database backup
pg_dump -h localhost -U minesweeper_user -d minesweeper > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U minesweeper_user -d minesweeper | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Backup
```bash
# Restore from backup
psql -h localhost -U minesweeper_user -d minesweeper < backup_20251031.sql

# From compressed backup
gunzip < backup_20251031.sql.gz | psql -h localhost -U minesweeper_user -d minesweeper
```

### Automated Backups
```bash
# Add to crontab for daily backups at 2 AM
crontab -e

# Add this line:
0 2 * * * pg_dump -h localhost -U minesweeper_user -d minesweeper | gzip > /backups/minesweeper_$(date +\%Y\%m\%d).sql.gz
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review PostgreSQL logs
3. Test connection manually with `psql`
4. Check application logs for errors

---

## Comparison: SQLite vs PostgreSQL

| Feature | SQLite (Original) | PostgreSQL (HA) |
|---------|------------------|-----------------|
| **Setup Complexity** | Simple | Moderate |
| **Multi-Server Support** | ❌ No | ✅ Yes |
| **Concurrent Writes** | Limited | Excellent |
| **Scalability** | Single server | Multiple servers |
| **Backup** | Copy file | pg_dump/streaming |
| **Best For** | Single server, development | Production, HA setup |

---

## Next Steps

1. ✅ Install PostgreSQL
2. ✅ Configure `.env` with database credentials  
3. ✅ Run migration: `npm run migrate-to-postgres`
4. ✅ Test locally: `npm run start:postgres`
5. ✅ Deploy to production servers
6. ✅ Set up load balancer
7. ✅ Configure automated backups
8. ✅ Monitor and optimize

Happy deploying! 🚀

