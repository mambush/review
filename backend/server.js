const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const { logger } = require('./utils/logger');
const errorHandler = require('./api/middleware/errorHandler');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const dbConnection = require('./config/database');

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logger

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', require('./api/routes/users'));
app.use('/api/events', require('./api/routes/events'));
app.use('/api/reviews', require('./api/routes/reviews'));
app.use('/api/categories', require('./api/routes/categories'));
app.use('/api/calendar', require('./api/routes/calendar'));
app.use('/api/notifications', require('./api/routes/notifications'));
app.use('/api/recommendations', require('./api/routes/recommendations'));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Event Reviews API' });
});

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  // server.close(() => process.exit(1));
});

module.exports = app; // For testing