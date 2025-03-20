const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

// Public routes
router.get('/event/:eventId', reviewController.getReviewsByEvent);
router.get('/event/:eventId/summary', reviewController.getEventReviewSummary);

// Protected routes
router.post('/', auth.authenticateUser, validation.validateReviewCreation, reviewController.createReview);
router.put('/:id', auth.authenticateUser, validation.validateReviewUpdate, reviewController.updateReview);
router.delete('/:id', auth.authenticateUser, reviewController.deleteReview);
router.get('/user', auth.authenticateUser, reviewController.getUserReviews);

// Admin routes
router.get('/admin/all', auth.authenticateUser, auth.authorizeAdmin, reviewController.adminGetAllReviews);
router.delete('/admin/reviews/:id', auth.authenticateUser, auth.authorizeAdmin, reviewController.adminDeleteReview);

module.exports = router;