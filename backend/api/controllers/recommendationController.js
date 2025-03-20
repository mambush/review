const db = require('../../config/database');
const logger = require('../../utils/logger');
const aiService = require('../../services/aiService');

/**
 * Get all recommendations for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUserRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT r.*, e.title, e.description, e.date, e.time, e.location, e.avg_rating, e.status
      FROM recommendations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY r.score DESC
    `;
    
    const [recommendations] = await db.query(query, [userId]);
    
    return res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error(`Error getting user recommendations: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Generate new recommendations for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.generateRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's preferences (based on past reviews and calendar)
    const [userReviews] = await db.query(`
      SELECT r.*, e.title, e.description, c.name as category
      FROM reviews r
      JOIN events e ON r.event_id = e.id
      JOIN event_categories ec ON e.id = ec.event_id
      JOIN categories c ON ec.category_id = c.id
      WHERE r.user_id = ?
    `, [userId]);
    
    // Get user's calendar entries
    const [userCalendar] = await db.query(`
      SELECT c.*, e.title, e.description
      FROM calendars c
      JOIN events e ON c.event_id = e.id
      WHERE c.user_id = ?
    `, [userId]);
    
    // Get available upcoming events that user hasn't reviewed or added to calendar
    const [availableEvents] = await db.query(`
      SELECT e.*, GROUP_CONCAT(c.name) as categories
      FROM events e
      JOIN event_categories ec ON e.id = ec.event_id
      JOIN categories c ON ec.category_id = c.id
      WHERE e.date >= CURDATE()
      AND e.status = 'upcoming'
      AND e.id NOT IN (
        SELECT event_id FROM reviews WHERE user_id = ?
      )
      AND e.id NOT IN (
        SELECT event_id FROM calendars WHERE user_id = ?
      )
      GROUP BY e.id
    `, [userId, userId]);
    
    if (availableEvents.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new events available for recommendations',
        data: []
      });
    }
    
    // Generate recommendations using AI service
    const recommendations = await aiService.generateRecommendations(
      userId,
      userReviews,
      userCalendar,
      availableEvents
    );
    
    // Save recommendations to database
    const insertPromises = recommendations.map(async (rec) => {
      // Check if recommendation already exists
      const [existing] = await db.query(
        'SELECT * FROM recommendations WHERE user_id = ? AND event_id = ?',
        [userId, rec.event_id]
      );
      
      if (existing.length > 0) {
        // Update existing recommendation
        await db.query(
          'UPDATE recommendations SET score = ?, reason = ? WHERE user_id = ? AND event_id = ?',
          [rec.score, rec.reason, userId, rec.event_id]
        );
      } else {
        // Insert new recommendation
        await db.query(
          'INSERT INTO recommendations (user_id, event_id, score, reason) VALUES (?, ?, ?, ?)',
          [userId, rec.event_id, rec.score, rec.reason]
        );
      }
    });
    
    await Promise.all(insertPromises);
    
    // Get updated recommendations
    const [updatedRecs] = await db.query(`
      SELECT r.*, e.title, e.description, e.date, e.time, e.location, e.avg_rating
      FROM recommendations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY r.score DESC
    `, [userId]);
    
    return res.status(200).json({
      success: true,
      count: updatedRecs.length,
      data: updatedRecs
    });
  } catch (error) {
    logger.error(`Error generating recommendations: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Get top recommendations for a user (limited number)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getTopRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query; // Default to top 5
    
    const query = `
      SELECT r.*, e.title, e.description, e.date, e.time, e.location, e.avg_rating, e.status
      FROM recommendations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ? AND e.date >= CURDATE() AND e.status = 'upcoming'
      ORDER BY r.score DESC
      LIMIT ?
    `;
    
    const [recommendations] = await db.query(query, [userId, parseInt(limit)]);
    
    return res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    logger.error(`Error getting top recommendations: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Delete a recommendation
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.deleteRecommendation = async (req, res) => {
  try {
    const recommendationId = req.params.id;
    const userId = req.user.id;
    
    // Verify recommendation belongs to user
    const [recommendation] = await db.query(
      'SELECT * FROM recommendations WHERE id = ? AND user_id = ?',
      [recommendationId, userId]
    );
    
    if (recommendation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found or does not belong to user'
      });
    }
    
    await db.query('DELETE FROM recommendations WHERE id = ?', [recommendationId]);
    
    return res.status(200).json({
      success: true,
      message: 'Recommendation deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting recommendation: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Provide feedback on a recommendation (for improving future recommendations)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.provideFeedback = async (req, res) => {
  try {
    const recommendationId = req.params.id;
    const userId = req.user.id;
    const { feedback } = req.body;
    
    if (!feedback || !['relevant', 'not_relevant'].includes(feedback)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid feedback (relevant or not_relevant)'
      });
    }
    
    // Verify recommendation belongs to user
    const [recommendation] = await db.query(
      'SELECT * FROM recommendations WHERE id = ? AND user_id = ?',
      [recommendationId, userId]
    );
    
    if (recommendation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recommendation not found or does not belong to user'
      });
    }
    
    // Store feedback in AI service for model improvement
    await aiService.storeRecommendationFeedback(
      userId,
      recommendation[0].event_id,
      feedback
    );
    
    return res.status(200).json({
      success: true,
      message: 'Feedback provided successfully'
    });
  } catch (error) {
    logger.error(`Error providing recommendation feedback: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Get recommendations by category
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getRecommendationsByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId } = req.params;
    
    // Verify category exists
    const [category] = await db.query(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );
    
    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    const query = `
      SELECT r.*, e.title, e.description, e.date, e.time, e.location, e.avg_rating
      FROM recommendations r
      JOIN events e ON r.event_id = e.id
      JOIN event_categories ec ON e.id = ec.event_id
      WHERE r.user_id = ? 
      AND ec.category_id = ?
      AND e.date >= CURDATE()
      ORDER BY r.score DESC
    `;
    
    const [recommendations] = await db.query(query, [userId, categoryId]);
    
    return res.status(200).json({
      success: true,
      count: recommendations.length,
      category: category[0].name,
      data: recommendations
    });
  } catch (error) {
    logger.error(`Error getting recommendations by category: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};