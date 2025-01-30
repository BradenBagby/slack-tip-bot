# Use Node.js LTS version as base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install OpenSSL - required for Prisma and install PM2 globally
RUN apt-get update -y && \
    apt-get install -y openssl && \
    npm install -g pm2 && \
    npm install -g typescript

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 4005
EXPOSE 4006

# Start the application using PM2
CMD ["npm", "run", "prod"]

