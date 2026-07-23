# Stage 1: Build production dependencies
FROM node:25-alpine AS builder
WORKDIR /app

# Copy dependency manifests and install production packages
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Minimal runtime image
FROM node:25-alpine AS runner

WORKDIR /app

# Copy built node_modules and application code with non-root ownership
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

# Set environment, non-root user, and start command
ENV NODE_ENV=production

# Ensure working directory and runtime folders are owned by node user
RUN mkdir -p /app/.moonlink && chown -R node:node /app

USER node

CMD ["sh", "-c", "node deploy-commands.js && node index.js"]