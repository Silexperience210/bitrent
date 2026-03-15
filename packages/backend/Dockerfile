# Multi-stage build for production
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Source code (optional, for security scanning)
FROM node:18-alpine AS source
WORKDIR /app
COPY . .

# Stage 3: Production image
FROM node:18-alpine

LABEL maintainer="BitRent Team"
LABEL version="1.0.0"
LABEL description="BitRent Backend - Nostr Bitcoin Mining Rental Platform"

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy dependencies from Stage 1
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=dependencies --chown=nodejs:nodejs /app/package*.json ./

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

# Expose port (will be overridden by Railway)
EXPOSE 3000

# Switch to non-root user
USER nodejs

# Environment variables (can be overridden)
ENV NODE_ENV=production
ENV PORT=3000

# Health check - verify API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start server
CMD ["node", "server.js"]

