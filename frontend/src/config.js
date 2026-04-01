// src/config.js
const config = {
  development: {
    backendUrl: 'http://localhost:8001',
  },
  production: {
    backendUrl: 'https://suits-india-backend.onrender.com',
  },
};

const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment];

// Override with environment variable if set
const backendUrl = process.env.REACT_APP_BACKEND_URL || currentConfig.backendUrl;

export { backendUrl };