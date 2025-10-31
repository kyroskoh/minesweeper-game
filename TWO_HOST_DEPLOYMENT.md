# Two-Host High Availability Deployment

**Simplified 2-host setup** where each host runs both the app AND database with automatic sync and failover.

## 📋 Overview

This setup provides **complete HA with just 2 servers**:

✅ **Host 1**: App1 + PostgreSQL1 + etcd (2 nodes)  
✅ **Host 2**: App2 + PostgreSQL2 + etcd  
✅ **Auto-Sync**: PostgreSQL1 ↔ PostgreSQL2  
✅ **Auto-Failover**: If primary DB fails, replica becomes primary  
✅ **Load Balancing**: Local HAProxy on each host  

### Key Difference from 5-Server Setup

| Setup | Servers | Complexity | Best For |
|-------|---------|------------|----------|
| **5-Server** | 5 (2 DB + 1 Coordinator + 2 App) | Higher | Large scale, dedicated DB servers |
| **2-Host** | 2 (everything co-located) | Lower | Small-medium scale, cost-effective |

---

## 🏗️ Architecture

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│       Host 1 (10.0.1.10)    │    │       Host 2 (10.0.1.11)    │
│                             │    │                             │
│  ┌────────────────────┐     │    │  ┌────────────────────┐     │
│  │   App 1 :3030      │     │    │  │   App 2 :3030      │     │
│  └─────────┬──────────┘     │    │  └─────────┬──────────┘     │
│            ↓                │    │            ↓                │
│  ┌────────────────────┐     │    │  ┌────────────────────┐     │
│  │ HAProxy1 :5000     │     │    │  │ HAProxy2 :5000     │     │
│  └─────────┬──────────┘     │    │  └─────────┬──────────┘     │
│            ↓                │    │            ↓                │
│  ┌────────────────────┐     │    │  ┌────────────────────┐     │
│  │ PostgreSQL1 :5432  │←────┼────┼─→│ PostgreSQL2 :5432  │     │
│  │ PRIMARY            │     │    │  │ REPLICA            │     │
│  └────────────────────┘     │    │  └────────────────────┘     │
│                             │    │                             │
│  ┌──────┐  ┌──────┐         │    │  ┌──────┐                  │
│  │etcd1 │  │etcd3 │←────────┼────┼─→│etcd2 │                  │
│  │:2379 │  │:2378 │         │    │  │:2379 │                  │
│  └──────┘  └──────┘         │    │  └──────┘                  │
│    (quorum nodes)           │    │                             │
└─────────────────────────────┘    └─────────────────────────────┘
           ↑                                    ↑
           └─────── External Load Balancer ────┘
                    (Nginx/CloudFlare/etc)
```

### How It Works

1. **App** connects to **local HAProxy** (port 5000)
2. **HAProxy** routes to primary PostgreSQL (wherever it is)
3. **PostgreSQL nodes** replicate data automatically
4. **etcd cluster** (3 nodes) manages failover
5. **External load balancer** distributes user traffic to both apps

---

## 🚀 Quick Start

### Prerequisites

**On both hosts:**
- Docker & Docker Compose installed
- Firewall configured (see below)
- Network connectivity between hosts
- Cloned repository

### Step 1: Configure Environment

**On Host 1:**
```bash
cd minesweeper-game

# Copy template
cp .env.host1.example .env.host1

# Edit with your IPs and passwords
nano .env.host1
```

**Example .env.host1:**
```env
HOST1_IP=10.0.1.10
HOST2_IP=10.0.1.11

POSTGRES_DB=minesweeper
POSTGRES_USER=minesweeper_user
POSTGRES_PASSWORD=SuperSecurePassword123!

POSTGRES_SUPERUSER=postgres
POSTGRES_SUPERUSER_PASSWORD=AdminPassword456!

REPLICATION_PASSWORD=ReplicationPass789!

DAILY_SEED_SALT=random-secret-salt-xyz-123
```

**On Host 2:**
```bash
cd minesweeper-game

# Copy template
cp .env.host2.example .env.host2

# Edit with SAME passwords and IPs as Host 1
nano .env.host2
```

**Important:** 
- ✅ Use SAME passwords on both hosts
- ✅ Use SAME DAILY_SEED_SALT on both hosts
- ✅ Update HOST1_IP and HOST2_IP with your actual IPs

### Step 2: Configure Firewall

**On both hosts:**
```bash
# PostgreSQL
sudo ufw allow 5432/tcp

# Patroni API
sudo ufw allow 8008/tcp

# etcd
sudo ufw allow 2379/tcp
sudo ufw allow 2380/tcp
sudo ufw allow 2378/tcp  # etcd3 on Host1

# App
sudo ufw allow 3030/tcp

# HAProxy stats (optional)
sudo ufw allow 7000/tcp

# Enable firewall
sudo ufw enable
```

### Step 3: Deploy Host 1

**On Host 1:**
```bash
# Make script executable
chmod +x deploy/deploy-host1.sh

# Deploy
./deploy/deploy-host1.sh
```

**Expected output:**
```
🚀 Deploying Minesweeper HA Stack to Host 1...
✅ Prerequisites checked
🔨 Building Docker images...
▶️  Starting services...
⏳ Waiting for services to be healthy...
✅ Host 1 deployed successfully!

📊 Container Status:
minesweeper-app1
minesweeper-postgres1
minesweeper-etcd1
minesweeper-etcd3
minesweeper-haproxy1

🔍 Service Endpoints:
   App: http://localhost:3030
   PostgreSQL: localhost:5432
   HAProxy: http://localhost:5000 (primary)
   HAProxy Stats: http://localhost:7000
   Patroni API: http://localhost:8008

⚠️  Next: Deploy Host 2 with ./deploy/deploy-host2.sh
```

### Step 4: Deploy Host 2

**On Host 2:**
```bash
# Make script executable
chmod +x deploy/deploy-host2.sh

# Deploy
./deploy/deploy-host2.sh
```

**Expected output:**
```
🚀 Deploying Minesweeper HA Stack to Host 2...
✅ Prerequisites checked
🔨 Building Docker images...
▶️  Starting services...
⏳ Waiting for services to be healthy...
✅ Host 2 deployed successfully!

✅ 2-Host HA Cluster Complete!
💡 Check cluster status: curl http://10.0.1.10:8008/cluster | jq
```

### Step 5: Verify Cluster

**From either host:**
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

# Check replication
docker exec minesweeper-postgres1 psql -U postgres -c \
  "SELECT application_name, state, sync_state FROM pg_stat_replication;"
```

### Step 6: Migrate Data (Optional)

**If you have existing SQLite data:**
```bash
# On either host
# Update .env to point to local HAProxy
nano .env
# Set: POSTGRES_HOST=localhost, POSTGRES_PORT=5000

# Run migration
npm install
npm run migrate-to-postgres
```

### Step 7: Set Up External Load Balancer

**Nginx example (on separate server or one of the hosts):**
```nginx
upstream minesweeper_app {
    server 10.0.1.10:3030;
    server 10.0.1.11:3030;
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

## 🔄 How Data Syncs

### Normal Operation

```
User → App1 → HAProxy1 → PostgreSQL1 (PRIMARY)
                            ↓
                     (streaming replication)
                            ↓
                          PostgreSQL2 (REPLICA)
```

- **Writes** go to PRIMARY (automatically detected by HAProxy)
- **Data streams** to REPLICA in real-time
- **Both apps** can access current primary through local HAProxy

### During Failover

**Scenario: Host 1 PostgreSQL fails**

```
1. PostgreSQL1 fails
2. Patroni detects failure (10 seconds)
3. etcd quorum votes
4. PostgreSQL2 promoted to PRIMARY
5. HAProxy1 and HAProxy2 route to new PRIMARY
6. Apps continue working (10-30s interruption)
```

### After Recovery

```
Host 1 PostgreSQL comes back online
→ Rejoins as REPLICA
→ Catches up with PRIMARY
→ Cluster healthy again
```

---

## 📊 Monitoring

### Check Cluster Status

```bash
# View cluster topology
curl http://10.0.1.10:8008/cluster | jq
curl http://10.0.1.11:8008/cluster | jq  # Same output

# Check which is primary
curl http://10.0.1.10:8008/primary  # 200 if primary, 503 if replica
curl http://10.0.1.11:8008/primary  # 200 if primary, 503 if replica
```

### HAProxy Statistics

**On Host 1:** `http://10.0.1.10:7000`  
**On Host 2:** `http://10.0.1.11:7000`

Shows:
- Which PostgreSQL is primary (green)
- Health status of both nodes
- Connection statistics

### View Logs

```bash
# Host 1
docker-compose -f docker-compose.host1.yml logs -f

# Specific service
docker logs minesweeper-postgres1
docker logs minesweeper-app1

# Host 2
docker-compose -f docker-compose.host2.yml logs -f
```

### Replication Lag

```bash
# On primary node
docker exec minesweeper-postgres1 psql -U postgres -c \
  "SELECT application_name, state, sync_state, 
   pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes 
   FROM pg_stat_replication;"

# Should show near 0 lag
```

---

## 🧪 Testing Failover

### Simulate Primary Failure

```bash
# Stop PostgreSQL on Host 1
docker stop minesweeper-postgres1

# Watch failover (10-30 seconds)
watch -n 1 'curl -s http://10.0.1.11:8008/cluster | jq .members'

# PostgreSQL2 becomes primary

# Restart failed node
docker start minesweeper-postgres1

# It rejoins as replica
```

### Test Application During Failover

```bash
# In one terminal, continuously test app
while true; do 
  curl -s http://10.0.1.10:3030/api/leaderboard > /dev/null && echo "✓" || echo "✗"
  sleep 1
done

# In another terminal, trigger failover
docker stop minesweeper-postgres1

# You'll see brief interruption (10-30s) then recovery
```

---

## 🔧 Maintenance

### Update Application

```bash
# Rolling update (zero downtime)

# Update Host 2 first
git pull
docker-compose -f docker-compose.host2.yml build
docker-compose -f docker-compose.host2.yml up -d

# Wait 30 seconds

# Update Host 1
git pull
docker-compose -f docker-compose.host1.yml build
docker-compose -f docker-compose.host1.yml up -d
```

### Backup Database

```bash
# Backup from primary
docker exec minesweeper-postgres1 pg_dump \
  -U minesweeper_user minesweeper \
  > backup_$(date +%Y%m%d).sql
```

### Manual Switchover

```bash
# Graceful switchover (no data loss)
curl -X POST http://10.0.1.10:8008/switchover \
  -H "Content-Type: application/json" \
  -d '{"leader": "postgres1", "candidate": "postgres2"}'
```

---

## 🐛 Troubleshooting

### Cluster Won't Form

**Problem:** etcd nodes can't connect

**Solution:**
```bash
# Test network connectivity
telnet 10.0.1.10 2379
telnet 10.0.1.11 2379

# Check firewall
sudo ufw status

# Check etcd logs
docker logs minesweeper-etcd1
docker logs minesweeper-etcd2
```

### Replication Not Working

**Problem:** Data not syncing between nodes

**Check:**
```bash
# On primary
docker exec minesweeper-postgres1 psql -U postgres -c \
  "SELECT * FROM pg_stat_replication;"

# Should show connection from replica

# On replica
docker exec minesweeper-postgres2 psql -U postgres -c \
  "SELECT * FROM pg_stat_wal_receiver;"

# Should show active streaming
```

### App Can't Connect to Database

**Problem:** App shows database connection errors

**Check:**
```bash
# Test HAProxy
curl http://localhost:5000

# Check PostgreSQL
docker exec minesweeper-postgres1 pg_isready

# Check app logs
docker logs minesweeper-app1

# Verify environment variables
docker exec minesweeper-app1 env | grep POSTGRES
```

---

## 📋 Configuration Reference

### Ports Used

| Service | Port | Purpose |
|---------|------|---------|
| App | 3030 | Web application |
| PostgreSQL | 5432 | Direct database access |
| HAProxy | 5000 | Primary DB (via load balancer) |
| HAProxy Stats | 7000 | Monitoring dashboard |
| Patroni API | 8008 | Health checks, management |
| etcd Client | 2379 | Configuration storage |
| etcd Peer | 2380 | etcd cluster communication |
| etcd3 (Host1) | 2378 | Third etcd node |

### Environment Variables

| Variable | Required | Same on Both? | Example |
|----------|----------|---------------|---------|
| `HOST1_IP` | ✅ | ✅ | `10.0.1.10` |
| `HOST2_IP` | ✅ | ✅ | `10.0.1.11` |
| `POSTGRES_PASSWORD` | ✅ | ✅ | Strong password |
| `POSTGRES_SUPERUSER_PASSWORD` | ✅ | ✅ | Strong password |
| `REPLICATION_PASSWORD` | ✅ | ✅ | Strong password |
| `DAILY_SEED_SALT` | ✅ | ✅ Must Match! | Random string |

---

## 🔒 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong passwords (20+ characters)
- [ ] Configure firewall on both hosts
- [ ] Use SSL for external load balancer
- [ ] Restrict PostgreSQL access to local network
- [ ] Enable SSL for PostgreSQL (production)
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup encryption
- [ ] Network isolation (VPN/VLAN)

---

## 📊 Comparison

### 2-Host vs 5-Server Setup

| Feature | 2-Host | 5-Server |
|---------|--------|----------|
| **Servers Required** | 2 | 5 |
| **Cost** | Lower | Higher |
| **Complexity** | Simple | Complex |
| **Dedicated DB** | No | Yes |
| **Failover** | ✅ Yes | ✅ Yes |
| **Auto-Sync** | ✅ Yes | ✅ Yes |
| **Scalability** | Good | Excellent |
| **Best For** | Small-medium | Large scale |

---

## 🎯 Benefits

✅ **Simple Deployment** - Just 2 servers needed  
✅ **Cost-Effective** - Lower infrastructure costs  
✅ **High Availability** - Automatic failover  
✅ **Data Sync** - Real-time replication  
✅ **Self-Healing** - Automatic recovery  
✅ **Production-Ready** - Battle-tested components  

---

## 📚 Related Documentation

- **5-Server Setup:** [POSTGRES_HA_REPLICATION.md](POSTGRES_HA_REPLICATION.md)
- **Docker Guide:** [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- **PostgreSQL Setup:** [POSTGRESQL_HA_SETUP.md](POSTGRESQL_HA_SETUP.md)

---

## 🎉 Summary

You now have a **2-host High Availability setup** with:

✅ Both app and database on each host  
✅ Automatic data synchronization  
✅ Automatic failover (10-30 seconds)  
✅ Self-healing cluster  
✅ Production-ready deployment  

**Your minesweeper game is highly available with just 2 servers! 🚀**

---

## Quick Commands

```bash
# Deploy
./deploy/deploy-host1.sh  # On Host 1
./deploy/deploy-host2.sh  # On Host 2

# Check status
curl http://10.0.1.10:8008/cluster | jq

# View logs
docker-compose -f docker-compose.host1.yml logs -f

# Stop
docker-compose -f docker-compose.host1.yml down
docker-compose -f docker-compose.host2.yml down

# Test failover
docker stop minesweeper-postgres1

# Restart
docker start minesweeper-postgres1
```

Happy deploying! 🎮💪

