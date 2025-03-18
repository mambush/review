const dotenv = require('dotenv');

dotenv.config();

const config = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || '3d6f1a7e9c4b1e6e9f1a2c5b7d8e3a9f1c4b6d7e9f1a3b5c6d7e8f9a2b3c4d6',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eventreviews'
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    apiUrl: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages'
  },
  upload: {
    path: process.env.UPLOAD_PATH || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

module.exports = config;