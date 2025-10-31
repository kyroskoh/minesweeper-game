# Minesweeper Game - Production Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application files
COPY backend/ ./backend/
COPY public/ ./public/
COPY scripts/ ./scripts/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3030

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3030/api/leaderboard', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Default to PostgreSQL mode for production
CMD ["node", "backend/server-postgres.js"]

