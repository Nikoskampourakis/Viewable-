# Multi-stage production build for Viewable
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json tsconfig*.json vite.config.ts index.html ./

# Install all dependencies
RUN npm ci

# Copy full application source
COPY src/ ./src/
COPY public/ ./public/
COPY server/ ./server/
COPY server.ts ./

# Build frontend static bundle
RUN npm run build

# Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build artifacts and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/public ./public

EXPOSE 3000

# Start server with tsx runner
CMD ["npx", "tsx", "server.ts"]
