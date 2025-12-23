# Stage 1: Build
FROM node:25.2.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nx.json ./

# Copy workspace configuration
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN cd apps/api && npx prisma generate

# Build the application
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

# Copy generated Prisma client
COPY --from=builder /app/apps/api/generated ./generated

# Expose port
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node main.js"]
