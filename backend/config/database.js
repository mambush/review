const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const { logger } = require('../utils/logger');

dotenv.config();

// Database connection pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'eventreviews',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('Database connection established successfully');
    connection.release();
    return true;
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    console.error('Database connection failed:', err);
    return false;
  }
}

// Initialize connection
testConnection();

module.exports = {
  pool,
  query: async (sql, params) => {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (error) {
      logger.error(`DB Query Error: ${error.message}`);
      throw error;
    }
  }
};