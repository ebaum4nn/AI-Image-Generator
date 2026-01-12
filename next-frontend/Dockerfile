# Development Dockerfile - Optimized for hot reloading
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm install

# Copy the rest of the source code
COPY . .

# Expose the default Next.js port
EXPOSE 3000

# Default command for development (can be overridden in compose)
CMD ["npm", "run", "dev"]
