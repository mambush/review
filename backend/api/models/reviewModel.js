// reviewModel.js
const db = require('../../config/database');
const Event = require('./eventModel');

/**
 * Review model
 */
const Review = {
  /**
   * Create a new review
   * @param {Object} reviewData - Review data
   * @returns {Object} - Created review object
   */
  async create(reviewData) {
    try {
      // Calculate sentiment (this would be integrated with a sentiment analysis service)
      let sentimentScore = null;
      let sentimentCategory = null;
      
      // If you have a sentiment analysis service, you would call it here
      // For now, we'll just assign a random score as a placeholder
      if (reviewData.content) {
        sentimentScore = Math.random() * 2 - 1; // Random score between -1 and 1
        
        if (sentimentScore > 0.3) {
          sentimentCategory = 'positive';
        } else if (sentimentScore < -0.3) {
          sentimentCategory = 'negative';
        } else {
          sentimentCategory = 'neutral';
        }
      }

      // Insert review into database
      const result = await db.query(
        `INSERT INTO reviews (user_id, event_id, rating, content, sentiment_score, sentiment_category) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          reviewData.user_id,
          reviewData.event_id,
          reviewData.rating,
          reviewData.content,
          sentimentScore,
          sentimentCategory
        ]
      );

      // Update event rating
      await Event.updateRating(reviewData.event_id);

      // Get the created review
      const [review] = await this.findById(result.insertId);
      return review;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find review by ID
   * @param {number} id - Review ID
   * @returns {Object} - Review object
   */
  async findById(id) {
    return await db.query(
      `SELECT r.*, u.username as user_name, e.title as event_title FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       WHERE r.id = ?`,
      [id]
    );
  },

  /**
   * Update review
   * @param {number} id - Review ID
   * @param {Object} reviewData - Review data to update
   * @returns {Object} - Updated review object
   */
  async update(id, reviewData) {
    // Get the current review to get the event_id
    const [currentReview] = await this.findById(id);
    if (!currentReview) {
      throw new Error('Review not found');
    }

    // Create dynamic update query based on provided fields
    const fields = [];
    const values = [];

    if (reviewData.rating) {
      fields.push('rating = ?');
      values.push(reviewData.rating);
    }
    
    if (reviewData.content) {
      fields.push('content = ?');
      values.push(reviewData.content);
      
      // Recalculate sentiment (this would be integrated with a sentiment analysis service)
      let sentimentScore = Math.random() * 2 - 1; // Random score between -1 and 1
      let sentimentCategory;
      
      if (sentimentScore > 0.3) {
        sentimentCategory = 'positive';
      } else if (sentimentScore < -0.3) {
        sentimentCategory = 'negative';
      } else {
        sentimentCategory = 'neutral';
      }
      
      fields.push('sentiment_score = ?');
      values.push(sentimentScore);
      fields.push('sentiment_category = ?');
      values.push(sentimentCategory);
    }

    // Only proceed if there are fields to update
    if (fields.length === 0) {
      return await this.findById(id);
    }

    // Add ID to values array
    values.push(id);

    // Execute update query
    await db.query(
      `UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Update event rating
    await Event.updateRating(currentReview.event_id);

    // Return updated review
    const [updatedReview] = await this.findById(id);
    return updatedReview;
  },

  /**
   * Delete review
   * @param {number} id - Review ID
   * @returns {boolean} - Success status
   */
  async delete(id) {
    // Get the current review to get the event_id
    const [currentReview] = await this.findById(id);
    if (!currentReview) {
      return false;
    }

    const result = await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    
    // Update event rating
    if (result.affectedRows > 0) {
      await Event.updateRating(currentReview.event_id);
      return true;
    }
    
    return false;
  },

  /**
   * Get reviews by event
   * @param {number} eventId - Event ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Array} - Array of review objects
   */
  async getByEvent(eventId, options = { limit: 10, offset: 0 }) {
    return await db.query(
      `SELECT r.*, u.username as user_name FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [eventId, options.limit, options.offset]
    );
  },

  /**
   * Get reviews by user
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Array} - Array of review objects
   */
  async getByUser(userId, options = { limit: 10, offset: 0 }) {
    return await db.query(
      `SELECT r.*, e.title as event_title FROM reviews r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, options.limit, options.offset]
    );
  },

  /**
   * Get review statistics
   * @param {number} eventId - Event ID
   * @returns {Object} - Review statistics
   */
  async getStats(eventId) {
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star,
        SUM(CASE WHEN sentiment_category = 'positive' THEN 1 ELSE 0 END) as positive_reviews,
        SUM(CASE WHEN sentiment_category = 'neutral' THEN 1 ELSE 0 END) as neutral_reviews,
        SUM(CASE WHEN sentiment_category = 'negative' THEN 1 ELSE 0 END) as negative_reviews
      FROM reviews
      WHERE event_id = ?`,
      [eventId]
    );
    
    return stats;
  }
};

module.exports = Review;