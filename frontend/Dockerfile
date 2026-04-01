FROM node:20.20.1-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --force

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Install serve to host the static files
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Run serve with the build folder
CMD ["serve", "-s", "build", "-l", "3000"]