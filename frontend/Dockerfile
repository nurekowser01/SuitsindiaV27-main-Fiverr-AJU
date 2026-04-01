FROM node:20.20.1-slim

WORKDIR /app

# Accept build arguments
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Update npm and clean cache
RUN npm install -g npm@latest && \
    npm cache clean --force

# Copy package files
COPY package*.json ./

# Install dependencies with retry logic
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set cache /tmp/npm-cache && \
    npm install --legacy-peer-deps --no-audit --no-fund || \
    (npm cache clean --force && npm install --legacy-peer-deps --no-audit --no-fund)

# Copy source code
COPY . .

# Build the app (now with the backend URL embedded)
RUN npm run build

# Install serve
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Run serve
CMD ["serve", "-s", "build", "-l", "3000"]