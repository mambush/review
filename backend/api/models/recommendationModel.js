// recommendationModel.js
const db = require('../../config/database');

/**
 * Recommendation model
 */
const Recommendation = {
  /**
   * Create or update a recommendation
   * @param {Object} recommendationData - Recommendation data
   * @returns {Object} - Created/updated recommendation object
   */
  async createOrUpdate(recommendationData) {
    try {
      // Check if recommendation already exists
      const [existingRecommendation] = await db.query(
        `SELECT id FROM recommendations WHERE user_id = ? AND event_id = ?`,
        [recommendationData.user_id, recommendationData.event_id]
      );

      let result;
      
      if (existingRecommendation) {
        // Update existing recommendation
        result = await db.query(
          `UPDATE recommendations SET score = ?, reason = ? WHERE id = ?`,
          [
            recommendationData.score,
            recommendationData.reason || null,
            existingRecommendation.id
          ]
        );
        
        // Get the updated recommendation
        const [updatedRecommendation] = await this.findById(existingRecommendation.id);
        return updatedRecommendation;
      } else {
        // Insert new recommendation
        result = await db.query(
          `INSERT INTO recommendations (user_id, event_id, score, reason) VALUES (?, ?, ?, ?)`,
          [
            recommendationData.user_id,
            recommendationData.event_id,
            recommendationData.score,
            recommendationData.reason || null
          ]
        );
        
        // Get the created recommendation
        const [newRecommendation] = await this.findById(result.insertId);
        return newRecommendation;
      }
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find recommendation by ID
   * @param {number} id - Recommendation ID
   * @returns {Object} - Recommendation object
   */
  async findById(id) {
    return await db.query(
      `SELECT r.*, e.title as event_title, e.date as event_date
       FROM recommendations r
       JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [id]
    );
  },

  /**
   * Delete recommendation
   * @param {number} id - Recommendation ID
   * @returns {boolean} - Success status
   */
  async delete(id) {
    const result = await db.query('DELETE FROM recommendations WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Get user recommendations
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Array} - Array of recommendation objects
   */
  async getUserRecommendations(userId, options = { limit: 10, offset: 0 }) {
    return await db.query(
      `SELECT r.*, e.title, e.description, e.date, e.time, e.location, e.status, e.image
       FROM recommendations r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = ? AND e.date >= CURDATE() AND e.status = 'upcoming'
       ORDER BY r.score DESC, e.date ASC
       LIMIT ? OFFSET ?`,
      [userId, options.limit, options.offset]
    );
  },

  /**
   * Generate recommendations for user
   * @param {number} userId - User ID
   * @returns {Array} - Array of recommendation objects
   * 
   * Note: This function would typically call an AI service or algorithm
   * to generate personalized recommendations. This implementation is a placeholder
   * that uses simple logic to recommend events.
   */
  async generateForUser(userId) {
    try {
      // Get user's past reviews and attended events
      const userReviews = await db.query(
        `SELECT r.event_id, r.rating, e.title, c.id as category_id
         FROM reviews r
         JOIN events e ON r.event_id = e.id
         JOIN event_categories ec ON e.id = ec.event_id
         JOIN categories c ON ec.category_id = c.id
         WHERE r.user_id = ?`,
        [userId]
      );
      
      // Get user's calendar events
      const userCalendar = await db.query(
        `SELECT c.event_id, e.title, ec.category_id
         FROM calendars c
         JOIN events e ON c.event_id = e.id
         JOIN event_categories ec ON e.id = ec.event_id
         WHERE c.user_id = ?`,
        [userId]
      );
      
      // Find categories the user is interested in
      const categoryInterest = {};
      
      userReviews.forEach(review => {
        if (!categoryInterest[review.category_id]) {
          categoryInterest[review.category_id] = 0;
        }
        categoryInterest[review.category_id] += review.rating;
      });
      
      userCalendar.forEach(event => {
        if (!categoryInterest[event.category_id]) {
          categoryInterest[event.category_id] = 0;
        }
        categoryInterest[event.category_id] += 3; // Attending an event shows interest
      });
      
      // Get upcoming events not already in user's calendar
      const upcomingEvents = await db.query(
        `SELECT e.id, e.title, e.date, e.time, e.location, e.status, ec.category_id, 
                e.avg_rating, COUNT(r.id) as review_count
         FROM events e
         JOIN event_categories ec ON e.id = ec.event_id
         LEFT JOIN reviews r ON e.id = r.event_id
         WHERE e.date >= CURDATE() 
         AND e.status = 'upcoming'
         AND e.id NOT IN (
           SELECT event_id FROM calendars WHERE user_id = ?
         )
         GROUP BY e.id, ec.category_id`,
        [userId]
      );
      
      // Score each event for the user
      const scoredEvents = {};
      
      upcomingEvents.forEach(event => {
        if (!scoredEvents[event.id]) {
          scoredEvents[event.id] = {
            event_id: event.id,
            title: event.title,
            score: 0,
            categories: []
          };
        }
        
        // Base score on category interest
        const categoryScore = categoryInterest[event.category_id] || 0;
        scoredEvents[event.id].score += categoryScore * 0.2;
        
        // Add category info
        scoredEvents[event.id].categories.push(event.category_id);
        
        // Factor in event popularity (review count and rating)
        scoredEvents[event.id].score += (event.avg_rating * 0.5) + (Math.min(event.review_count, 10) * 0.03);
      });
      
      // Convert to array and sort by score
      const recommendations = Object.values(scoredEvents)
        .map(item => ({
          user_id: userId,
          event_id: item.event_id,
          score: parseFloat(item.score.toFixed(4)),
          reason: `Based on your interest in events like "${item.title}"`
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);
      
      // Save recommendations to database
      const savedRecommendations = [];
      
      for (const rec of recommendations.slice(0, 20)) { // Limit to top 20
        const saved = await this.createOrUpdate(rec);
        savedRecommendations.push(saved);
      }
      
      return savedRecommendations;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get popular events
   * @param {Object} options - Query options (limit, categoryId)
   * @returns {Array} - Array of popular event objects
   */
  async getPopularEvents(options = { limit: 10, categoryId: null }) {
    let query = `
      SELECT e.id, e.title, e.description, e.date, e.time, e.location, 
             e.image, e.avg_rating, COUNT(r.id) as review_count,
             COUNT(c.id) as calendar_count
      FROM events e
      LEFT JOIN reviews r ON e.id = r.event_id
      LEFT JOIN calendars c ON e.id = c.event_id
    `;
    
    const queryParams = [];
    
    if (options.categoryId) {
      query += `
        JOIN event_categories ec ON e.id = ec.event_id
        WHERE ec.category_id = ? AND e.date >= CURDATE() AND e.status = 'upcoming'
      `;
      queryParams.push(options.categoryId);
    } else {
      query += `
        WHERE e.date >= CURDATE() AND e.status = 'upcoming'
      `;
    }
    
    query += `
      GROUP BY e.id
      ORDER BY (e.avg_rating * 0.5) + (calendar_count * 0.3) + (review_count * 0.2) DESC
      LIMIT ?
    `;
    queryParams.push(options.limit);
    
    return await db.query(query, queryParams);
  },

  /**
   * Delete old recommendations
   * @param {number} days - Days to keep
   * @returns {number} - Number of recommendations deleted
   */
  async deleteOldRecommendations(days = 7) {
    const result = await db.query(
      `DELETE FROM recommendations WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    
    return result.affectedRows;
  }
};

module.exports = Recommendation;