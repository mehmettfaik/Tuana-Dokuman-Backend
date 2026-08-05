FROM node:20-alpine

# Install system dependencies required for canvas/pdf generation
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    python3 \
    pkgconfig

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
