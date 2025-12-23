# Stage 1: Build
FROM node:25.2.1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nx.json ./

# Copy workspace configuration
COPY packages ./packages
COPY apps/dividends ./apps/dividends

# Install dependencies
RUN npm ci

# Build the application for production
RUN npx nx build dividends --configuration=production

# Stage 2: Production - Serve with nginx
FROM nginx:alpine

# Copy built application
COPY --from=builder /app/dist/apps/dividends/browser /usr/share/nginx/html

# Copy nginx configuration
COPY apps/dividends/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
