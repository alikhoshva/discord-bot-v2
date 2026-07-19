# ==============================================================================
# Stage 1: Builder - Install production dependencies
# ==============================================================================
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package definition files
COPY package.json package-lock.json ./

# Install production dependencies using fast, reproducible 'npm ci'
RUN npm ci --only=production && npm cache clean --force

# ==============================================================================
# Stage 2: Runner - Production runtime
# ==============================================================================
FROM node:25-alpine AS runner

# Install runtime dependencies (ffmpeg for audio processing)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Start bot: deploy slash commands and run bot process
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]