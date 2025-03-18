const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const { ApiError } = require('./errorHandler');
const db = require('../../config/database');

/**
 * Middleware to protect routes that require authentication
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ApiError('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.app.jwtSecret);

    // Check if user still exists
    const [user] = await db.query(
      'SELECT id, username, email, is_admin FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      return next(new ApiError('The user belonging to this token no longer exists', 401));
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError('Not authorized to access this route', 401));
  }
};

/**
 * Middleware to restrict access to admin users
 */
exports.admin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return next(new ApiError('Access denied. Admin privileges required', 403));
  }
  next();
};

/**
 * Middleware to check if user can modify a resource
 * @param {string} model - The database model to check (e.g., 'events', 'reviews')
 * @param {string} paramName - The request parameter containing the resource ID (e.g., 'id')
 * @param {string} ownerField - The field in the model representing the owner (e.g., 'user_id', 'organizer_id')
 */
exports.checkOwnership = (model, paramName, ownerField) => {
  return async (req, res, next) => {
    try {
      // If user is admin, allow access
      if (req.user.is_admin) {
        return next();
      }

      const resourceId = req.params[paramName];
      
      // Check if resource exists and belongs to user
      const [resource] = await db.query(
        `SELECT ${ownerField} FROM ${model} WHERE id = ?`,
        [resourceId]
      );

      if (!resource) {
        return next(new ApiError(`${model.slice(0, -1)} not found`, 404));
      }

      // Check if user owns the resource
      if (resource[ownerField] !== req.user.id) {
        return next(new ApiError('Not authorized to modify this resource', 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
