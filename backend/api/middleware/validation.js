const { body, param, query, validationResult } = require('express-validator');
const { ApiError } = require('./errorHandler');

/**
 * Process validation results
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new ApiError('Validation error', 400);
    error.errors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    return next(error);
  }
  next();
};

/**
 * User validation rules
 */
exports.userRules = {
  // Create user validation
  createUser: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  
  // Update user validation
  updateUser: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address'),
    body('bio')
      .optional()
      .isString()
      .withMessage('Bio must be a string')
  ],
  
  // Login validation
  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .exists()
      .withMessage('Password is required')
  ]
};

/**
 * Event validation rules
 */
exports.eventRules = {
  // Create event validation
  createEvent: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 255 })
      .withMessage('Title must be between 5 and 255 characters'),
    body('description')
      .isString()
      .withMessage('Description must be a string')
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('date')
      .isDate()
      .withMessage('Date must be a valid date format (YYYY-MM-DD)'),
    body('time')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Time must be in format HH:MM (24-hour)'),
    body('location')
      .trim()
      .isLength({ min: 5, max: 255 })
      .withMessage('Location must be between 5 and 255 characters'),
    body('categories')
      .isArray()
      .withMessage('Categories must be an array of category IDs')
  ],
  
  // Update event validation
  updateEvent: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 255 })
      .withMessage('Title must be between 5 and 255 characters'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('date')
      .optional()
      .isDate()
      .withMessage('Date must be a valid date format (YYYY-MM-DD)'),
    body('time')
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Time must be in format HH:MM (24-hour)'),
    body('location')
      .optional()
      .trim()
      .isLength({ min: 5, max: 255 })
      .withMessage('Location must be between 5 and 255 characters'),
    body('status')
      .optional()
      .isIn(['upcoming', 'ongoing', 'completed', 'cancelled'])
      .withMessage('Status must be one of: upcoming, ongoing, completed, cancelled'),
    body('categories')
      .optional()
      .isArray()
      .withMessage('Categories must be an array of category IDs')
  ]
};

/**
 * Review validation rules
 */
exports.reviewRules = {
  // Create review validation
  createReview: [
    body('event_id')
      .isInt({ min: 1 })
      .withMessage('Valid event ID is required'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('content')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Review content must be at least 10 characters')
  ],
  
  // Update review validation
  updateReview: [
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('content')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Review content must be at least 10 characters')
  ]
};

/**
 * Category validation rules
 */
exports.categoryRules = {
  // Create category validation
  createCategory: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Category name must be between 3 and 100 characters'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
  ],
  
  // Update category validation
  updateCategory: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Category name must be between 3 and 100 characters'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
  ]
};

/**
 * Calendar validation rules
 */
exports.calendarRules = {
  // Create calendar entry validation
  createCalendarEntry: [
    body('event_id')
      .isInt({ min: 1 })
      .withMessage('Valid event ID is required'),
    body('reminder_settings')
      .optional()
      .isJSON()
      .withMessage('Reminder settings must be valid JSON')
  ],
  
  // Update calendar entry validation
  updateCalendarEntry: [
    body('reminder_settings')
      .optional()
      .isJSON()
      .withMessage('Reminder settings must be valid JSON'),
    body('is_synced')
      .optional()
      .isBoolean()
      .withMessage('is_synced must be a boolean value')
  ]
};

/**
 * Common ID parameter validation
 */
exports.idParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID parameter must be a positive integer')
];

/**
 * Pagination query parameters validation
 */
exports.paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];