# PostgreSQL High Availability with Replication

Complete guide for deploying 2 PostgreSQL servers that automatically sync data with automatic failover.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Deployment Options](#deployment-options)
5. [Step-by-Step Setup](#step-by-step-setup)
6. [Testing Failover](#testing-failover)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## Overview

This setup provides **High Availability PostgreSQL** with:

✅ **2 PostgreSQL Servers** - Data syncs automatically between them  
✅ **Automatic Failover** - If primary fails, replica becomes primary instantly  
✅ **Zero Data Loss** - Synchronous replication ensures data consistency  
✅ **Load Balancing** - HAProxy routes traffic to healthy nodes  
✅ **Automatic Recovery** - Failed nodes auto-rejoin when back online  

### Key Technologies

- **Patroni** - PostgreSQL HA orchestration
- **etcd** - Distributed configuration and leader election
- **HAProxy** - Load balancer and health checker
- **PostgreSQL 15** - Database with streaming replication

---

## Architecture

### Option 1: All-in-One (Testing/Development)

```
┌─────────────────────────────────────┐
│      Single Docker Host             │
│                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │etcd1 │ │etcd2 │ │etcd3 │        │
│  └───┬──┘ └───┬──┘ └───┬──┘        │
│      └────────┼────────┘            │
│               ↓                     │
│      ┌────────────────┐             │
│      │  Patroni DCS   │             │
│      └────────────────┘             │
│               ↓                     │
│    ┌──────────┴──────────┐          │
│    ↓                     ↓          │
│ ┌────────┐           ┌────────┐    │
│ │Postgres│←──sync──→ │Postgres│    │
│ │ Node 1 │           │ Node 2 │    │
│ │PRIMARY │           │ REPLICA│    │
│ └───┬────┘           └───┬────┘    │
│     └────────┬───────────┘          │
│              ↓                      │
│        ┌──────────┐                 │
│        │ HAProxy  │                 │
│        │  :5000   │                 │
│        └──────────┘                 │
└─────────────────────────────────────┘
```

**Command:** `docker-compose -f docker-compose.postgres-ha.yml up -d`

### Option 2: Distributed (Production - 5 Servers)

```
┌────────────────┐   ┌────────────────┐
│  DB Server 1   │   │  DB Server 2   │
│                │   │                │
│  ┌─────────┐   │   │   ┌─────────┐  │
│  │  etcd1  │   │   │   │  etcd2  │  │
│  └────┬────┘   │   │   └────┬────┘  │
│       ↓        │   │        ↓       │
│  ┌─────────┐   │   │   ┌─────────┐  │
│  │Postgres1│←──┼───┼──→│Postgres2│  │
│  │ PRIMARY │   │   │   │ REPLICA │  │
│  │  :5432  │   │   │   │  :5432  │  │
│  └─────────┘   │   │   └─────────┘  │
└────────┬───────┘   └────────┬───────┘
         │                    │
         └──────────┬─────────┘
                    ↓
         ┌──────────────────┐
         │ Coordinator      │
         │                  │
         │  ┌─────────┐     │
         │  │  etcd3  │     │
         │  └────┬────┘     │
         │       ↓          │
         │  ┌─────────┐     │
         │  │HAProxy  │     │
         │  │  :5000  │     │
         │  └────┬────┘     │
         └───────┼──────────┘
                 ↓
         ┏━━━━━━━┻━━━━━━━┓
         ↓                ↓
    ┌────────┐      ┌────────┐
    │ App    │      │ App    │
    │Server 1│      │Server 2│
    └────────┘      └────────┘
```

**5 Servers Required:**
1. **DB Server 1** - postgres1 + etcd1
2. **DB Server 2** - postgres2 + etcd2  
3. **Coordinator** - etcd3 + HAProxy (quorum/load balancer)
4. **App Server 1** - Minesweeper app
5. **App Server 2** - Minesweeper app

---

## Components

### 1. **Patroni**
- Manages PostgreSQL lifecycle
- Handles automatic failover
- Performs health checks
- Manages replication

### 2. **etcd** (3 nodes for quorum)
- Stores cluster state
- Leader election for primary node
- Configuration management
- Distributed consensus

### 3. **HAProxy**
- Routes writes to PRIMARY (port 5000)
- Routes reads to any replica (port 5001)
- Health checking via Patroni API
- Statistics dashboard (port 7000)

### 4. **PostgreSQL Streaming Replication**
- Asynchronous replication by default
- Can be synchronous for zero data loss
- Automatic recovery and catch-up
- Hot standby for read queries

---

## Deployment Options

### Option A: All-in-One (Local Testing)

**Best for:** Development, testing, learning

```bash
# 1. Configure
cp .env.postgres-ha.example .env.postgres-ha
nano .env.postgres-ha  # Set passwords

# 2. Start cluster
docker-compose -f docker-compose.postgres-ha.yml up -d

# 3. Check status
docker ps
curl http://localhost:8080/cluster

# 4. Connect apps
# Use: POSTGRES_HOST=localhost, POSTGRES_PORT=5000
```

### Option B: Distributed 5-Server Setup (Production)

**Best for:** Production, true high availability

#### Server Layout

| Server | Components | IP Example |
|--------|-----------|------------|
| DB Server 1 | postgres1 + etcd1 | 10.0.1.10 |
| DB Server 2 | postgres2 + etcd2 | 10.0.1.11 |
| Coordinator | etcd3 + HAProxy | 10.0.1.12 |
| App Server 1 | Minesweeper app | 10.0.1.13 |
| App Server 2 | Minesweeper app | 10.0.1.14 |

---

## Step-by-Step Setup

### Prerequisites

**On all servers:**
```bash
# Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone repository
git clone <your-repo>
cd minesweeper-game
```

### Step 1: Configure Environment Files

**Create environment files with SAME passwords on all servers:**

```bash
# On all DB servers and coordinator
cp .env.postgres-ha.example .env.postgres-ha

# Edit with your IPs and passwords
nano .env.postgres-ha
```

**Important:** All passwords MUST match across all servers!

```env
# Example .env.postgres-ha
DB_SERVER1_IP=10.0.1.10
DB_SERVER2_IP=10.0.1.11
COORDINATOR_IP=10.0.1.12

POSTGRES_DB=minesweeper
POSTGRES_USER=minesweeper_user
POSTGRES_PASSWORD=super-secure-password-123

POSTGRES_SUPERUSER=postgres
POSTGRES_SUPERUSER_PASSWORD=super-admin-password-456

REPLICATION_PASSWORD=replication-password-789
PATRONI_ADMIN_PASSWORD=patroni-admin-password-012
```

### Step 2: Deploy DB Server 1

**On 10.0.1.10:**
```bash
# Set environment
export DB_SERVER1_IP=10.0.1.10
export DB_SERVER2_IP=10.0.1.11
export COORDINATOR_IP=10.0.1.12

# Deploy
docker-compose -f deploy/docker-compose.db-server1.yml up -d

# Check status
docker ps
docker logs minesweeper-postgres1

# Wait for it to become primary
curl http://localhost:8008/primary
# Should return 200 OK

# Configure firewall
sudo ufw allow 5432/tcp
sudo ufw allow 8008/tcp
sudo ufw allow 2379/tcp
sudo ufw allow 2380/tcp
```

### Step 3: Deploy DB Server 2

**On 10.0.1.11:**
```bash
# Set environment
export DB_SERVER1_IP=10.0.1.10
export DB_SERVER2_IP=10.0.1.11
export COORDINATOR_IP=10.0.1.12

# Deploy
docker-compose -f deploy/docker-compose.db-server2.yml up -d

# Check status
docker ps
docker logs minesweeper-postgres2

# Wait for replication to start
curl http://localhost:8008/replica
# Should return 200 OK

# Configure firewall
sudo ufw allow 5432/tcp
sudo ufw allow 8008/tcp
sudo ufw allow 2379/tcp
sudo ufw allow 2380/tcp
```

### Step 4: Deploy Coordinator (HAProxy)

**On 10.0.1.12:**
```bash
# Set environment
export DB_SERVER1_IP=10.0.1.10
export DB_SERVER2_IP=10.0.1.11
export COORDINATOR_IP=10.0.1.12

# Deploy
docker-compose -f deploy/docker-compose.coordinator.yml up -d

# Check status
docker ps
curl http://localhost:8080/cluster

# Test HAProxy
curl http://localhost:7000  # Stats page

# Configure firewall
sudo ufw allow 5000/tcp   # Primary DB
sudo ufw allow 5001/tcp   # Replicas
sudo ufw allow 7000/tcp   # HAProxy stats
sudo ufw allow 2379/tcp
sudo ufw allow 2380/tcp
```

### Step 5: Verify Cluster

**From any server:**
```bash
# Check cluster status
curl http://10.0.1.10:8008/cluster | jq

# Should show:
# {
#   "members": [
#     {"name": "postgres1", "role": "leader", ...},
#     {"name": "postgres2", "role": "replica", ...}
#   ]
# }

# Test HAProxy
curl http://10.0.1.12:7000  # Web UI
```

### Step 6: Migrate Data

**From any machine with access to both old DB and new cluster:**
```bash
# Update .env to point to HAProxy
nano .env
# Set: POSTGRES_HOST=10.0.1.12, POSTGRES_PORT=5000

# Run migration
npm install
npm run migrate-to-postgres

# Verify data
docker exec minesweeper-postgres1 psql -U minesweeper_user -d minesweeper -c "SELECT COUNT(*) FROM leaderboard;"
```

### Step 7: Deploy App Servers

**On App Server 1 (10.0.1.13):**
```bash
# Configure to use HAProxy
cp .env.server1-ha.example .env.server1
nano .env.server1

# Set:
POSTGRES_HOST=10.0.1.12  # HAProxy/Coordinator IP
POSTGRES_PORT=5000       # HAProxy primary port

# Deploy
./deploy/deploy-server1.sh
```

**On App Server 2 (10.0.1.14):**
```bash
# Same configuration as Server 1
cp .env.server2-ha.example .env.server2
nano .env.server2

# Set same HAProxy connection
POSTGRES_HOST=10.0.1.12
POSTGRES_PORT=5000

# Deploy
./deploy/deploy-server2.sh
```

### Step 8: Set Up Application Load Balancer

**Nginx config (separate load balancer or coordinator server):**
```nginx
upstream minesweeper_app {
    server 10.0.1.13:3030;
    server 10.0.1.14:3030;
}

server {
    listen 80;
    server_name minesweeper.example.com;
    
    location / {
        proxy_pass http://minesweeper_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Testing Failover

### Simulate Primary Failure

```bash
# Stop primary node (postgres1)
docker stop minesweeper-postgres1

# Watch failover happen (takes ~10-30 seconds)
watch -n 1 'curl -s http://10.0.1.12:8080/cluster | jq .members'

# You'll see postgres2 become the new leader/primary

# Your apps continue working! No downtime!

# Restart postgres1 - it will rejoin as replica
docker start minesweeper-postgres1

# postgres1 is now a replica, postgres2 is primary
```

### Manual Switchover (Planned Maintenance)

```bash
# Planned switchover (no downtime, zero data loss)
curl -X POST http://10.0.1.10:8008/switchover \
  -H "Content-Type: application/json" \
  -d '{"leader": "postgres1", "candidate": "postgres2"}'

# Patroni performs graceful switchover
# postgres2 becomes primary
# postgres1 becomes replica
```

---

## Monitoring

### Cluster Status

```bash
# View cluster topology
curl http://<any-postgres-ip>:8008/cluster | jq

# Check primary
curl http://10.0.1.10:8008/primary  # 200 if primary, 503 if not

# Check replica
curl http://10.0.1.11:8008/replica  # 200 if replica, 503 if primary
```

### HAProxy Statistics

Open in browser: `http://10.0.1.12:7000`

Shows:
- Which node is primary (green)
- Which nodes are healthy
- Connection counts
- Traffic statistics

### Replication Lag

```bash
# Connect to any node
docker exec -it minesweeper-postgres1 psql -U postgres

# Check replication status
SELECT * FROM pg_stat_replication;

# Check lag (should be near 0)
SELECT 
    application_name,
    client_addr,
    state,
    sync_state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS sending_lag,
    pg_wal_lsn_diff(sent_lsn, write_lsn) AS receiving_lag,
    pg_wal_lsn_diff(write_lsn, flush_lsn) AS flushing_lag,
    pg_wal_lsn_diff(flush_lsn, replay_lsn) AS replaying_lag
FROM pg_stat_replication;
```

---

## Troubleshooting

### Cluster Won't Form

**Problem:** Nodes can't connect to etcd

**Solution:**
```bash
# Check etcd cluster health
curl http://10.0.1.10:2379/health

# Check network connectivity
telnet 10.0.1.10 2379
telnet 10.0.1.11 2379
telnet 10.0.1.12 2379

# Check firewall
sudo ufw status

# Allow etcd ports
sudo ufw allow 2379/tcp
sudo ufw allow 2380/tcp
```

### Replication Not Working

**Problem:** Data not syncing between nodes

**Check replication status:**
```bash
# On primary
docker exec minesweeper-postgres1 psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Should show replica connection

# On replica
docker exec minesweeper-postgres2 psql -U postgres -c "SELECT * FROM pg_stat_wal_receiver;"

# Should show active streaming
```

### Split Brain Prevention

**Patroni prevents split brain through:**
- etcd distributed consensus (requires 2/3 quorum)
- Leader lease mechanism (TTL: 30 seconds)
- Fencing via pg_rewind

**If you see split brain warnings:**
```bash
# Check etcd cluster
curl http://10.0.1.10:2379/v2/members

# Ensure 3 etcd nodes are healthy
```

### HAProxy Can't Connect to PostgreSQL

**Problem:** HAProxy shows all backends down

**Check:**
```bash
# Test Patroni API
curl http://10.0.1.10:8008/primary
curl http://10.0.1.11:8008/replica

# Check PostgreSQL is listening
docker exec minesweeper-postgres1 pg_isready

# Check HAProxy config
docker exec minesweeper-haproxy cat /usr/local/etc/haproxy/haproxy.cfg
```

---

## Maintenance

### Backup

```bash
# Backup from primary (via HAProxy)
docker exec minesweeper-haproxy pg_dump \
  -h postgres1 -p 5432 \
  -U minesweeper_user minesweeper \
  > backup_$(date +%Y%m%d).sql

# Or directly from node
docker exec minesweeper-postgres1 \
  pg_dump -U minesweeper_user minesweeper \
  > backup.sql
```

### Restore

```bash
# Restore to cluster (writes go to primary automatically)
cat backup.sql | docker exec -i minesweeper-haproxy \
  psql -h postgres1 -p 5432 -U minesweeper_user minesweeper
```

### Update PostgreSQL Version

```bash
# Rolling upgrade (no downtime)

# 1. Update replica first
docker-compose -f deploy/docker-compose.db-server2.yml pull
docker-compose -f deploy/docker-compose.db-server2.yml up -d

# 2. Switchover to make replica the new primary
curl -X POST http://10.0.1.11:8008/switchover

# 3. Update old primary
docker-compose -f deploy/docker-compose.db-server1.yml pull
docker-compose -f deploy/docker-compose.db-server1.yml up -d
```

### Add More Replicas

```bash
# Copy db-server2 config, change IPs
# Deploy on new server
# Patroni auto-discovers and starts replication
```

---

## Performance Tuning

### Synchronous Replication (Zero Data Loss)

Edit `patroni/patroni.yml`:
```yaml
bootstrap:
  dcs:
    postgresql:
      parameters:
        synchronous_commit: on
        synchronous_standby_names: '*'
```

**Trade-off:** Writes wait for replica confirmation (slower, but safer)

### Read Load Balancing

```bash
# Use port 5001 for read-only queries
POSTGRES_HOST=10.0.1.12
POSTGRES_PORT=5001  # Replicas

# Use port 5000 for writes
POSTGRES_PORT=5000  # Primary
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong passwords (20+ characters)
- [ ] Enable SSL/TLS for PostgreSQL connections
- [ ] Restrict PostgreSQL ports to specific IPs
- [ ] Secure etcd with client certificates (production)
- [ ] Enable HAProxy authentication
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Network isolation (VPC/VLAN)

---

## Quick Reference

| Component | Port | Purpose |
|-----------|------|---------|
| PostgreSQL | 5432 | Database connection |
| Patroni API | 8008 | Health checks, management |
| etcd Client | 2379 | Configuration storage |
| etcd Peer | 2380 | etcd cluster communication |
| HAProxy Primary | 5000 | Write operations (primary only) |
| HAProxy Replica | 5001 | Read operations (any replica) |
| HAProxy Stats | 7000 | Monitoring dashboard |

### Key Commands

```bash
# Cluster status
curl http://<postgres-ip>:8008/cluster | jq

# Trigger failover
curl -X POST http://<postgres-ip>:8008/failover

# Planned switchover
curl -X POST http://<postgres-ip>:8008/switchover

# HAProxy stats
curl http://<coordinator-ip>:7000

# Check replication
docker exec postgres1 psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

---

## Benefits of This Setup

✅ **High Availability** - Automatic failover in 10-30 seconds  
✅ **Data Safety** - Continuous replication, no data loss  
✅ **Read Scaling** - Distribute read queries across replicas  
✅ **Zero Downtime Maintenance** - Rolling updates and switchovers  
✅ **Self-Healing** - Failed nodes auto-rejoin when recovered  
✅ **Production-Ready** - Used by thousands of companies worldwide  

---

## Next Steps

1. ✅ Test failover scenarios
2. ✅ Set up monitoring (Prometheus/Grafana)
3. ✅ Configure automated backups
4. ✅ Test application behavior during failover
5. ✅ Document your runbook
6. ✅ Train team on operations

---

**Your PostgreSQL cluster is now highly available! 🎉**

Need help? Check:
- [Docker Deployment Guide](DOCKER_DEPLOYMENT.md)
- [PostgreSQL Setup Guide](POSTGRESQL_HA_SETUP.md)
- Patroni Docs: https://patroni.readthedocs.io/

