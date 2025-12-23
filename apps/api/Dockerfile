# Stage 1: Build
FROM node:25.2.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nx.json ./

# Install dependencies first (better caching)
RUN npm ci

# Copy workspace configuration and source code
COPY packages ./packages
COPY apps/api ./apps/api

# Generate Prisma Client
WORKDIR /app
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate --config=apps/api/prisma.config.ts

# Build the application from workspace root
WORKDIR /app
RUN npx nx build api
RUN npx nx run api:prune

# Stage 2: Production
FROM node:25.2.1-alpine

WORKDIR /app

# Install production dependencies only
COPY --from=builder /app/dist/apps/api/package*.json ./
RUN npm ci --omit=dev

# Copy built application and workspace modules
COPY --from=builder /app/dist/apps/api ./
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./prisma.config.ts

# Copy generated Prisma client
COPY --from=builder /app/apps/api/generated ./generated

# Expose port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy --config=prisma.config.ts && node main.js"]
