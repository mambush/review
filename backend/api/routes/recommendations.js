const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all recommendations for a user
router.get('/', recommendationController.getUserRecommendations);

// Get top recommendations
router.get('/top', recommendationController.getTopRecommendations);

// Get recommendations by category
router.get('/category/:categoryId', recommendationController.getRecommendationsByCategory);

// Generate new recommendations
router.post('/generate', recommendationController.generateRecommendations);

// Provide feedback on a recommendation
router.post('/:id/feedback', recommendationController.provideFeedback);

// Delete a recommendation
router.delete('/:id', recommendationController.deleteRecommendation);

module.exports = router;