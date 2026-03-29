FROM node:20.20.1-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies

RUN rm -rf node_modules package-lock.json
RUN npm install --legacy-peer-deps --force

# Copy source code
COPY . .

RUN npm run build

ENV BACKEND_HOST=backend 

# Expose port
EXPOSE 3000

# Run application
CMD ["npm", "run", "start"]
