const { logger } = require('../../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.name}: ${err.message}`, { 
    method: req.method,
    url: req.url,
    body: req.body,
    stack: err.stack
  });

  // Error response object
  const error = {
    message: err.message || 'Server Error',
    status: err.statusCode || 500
  };

  // Add validation errors if available
  if (err.errors) {
    error.errors = err.errors;
  }

  // Add more detailed info in development
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  res.status(error.status).json({
    success: false,
    error: error
  });
};

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found error handler
 */
const notFound = (req, res, next) => {
  const error = new ApiError(`Not Found - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = errorHandler;
module.exports.ApiError = ApiError;
module.exports.notFound = notFound;