const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./config/database');
const logger = require('./utils/logger');

// Import routes
const usersRoutes = require('./api/routes/users');
const eventsRoutes = require('./api/routes/events');
const reviewsRoutes = require('./api/routes/reviews');
const categoriesRoutes = require('./api/routes/categories');
const calendarRoutes = require('./api/routes/calendar');
const notificationsRoutes = require('./api/routes/notifications');
const recommendationsRoutes = require('./api/routes/recommendations');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Test database connection
(async () => {
  const connected = await db.testConnection();
  if (!connected) {
    logger.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }
})();

// Routes
app.use('/api/users', usersRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Event Reviews API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});