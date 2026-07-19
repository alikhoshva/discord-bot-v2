# Stage 1: Build production dependencies
FROM node:25-alpine AS builder
WORKDIR /app

# Copy dependency manifests and install production packages
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Minimal runtime image
FROM node:25-alpine AS runner

# Install system dependencies (ffmpeg)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy built node_modules and application code with non-root ownership
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

# Set environment, non-root user, and start command
ENV NODE_ENV=production
USER node

CMD ["sh", "-c", "node deploy-commands.js && node index.js"]