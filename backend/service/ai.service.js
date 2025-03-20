const logger = require('../utils/logger');

/**
 * Service to handle AI-related functionalities
 */
class AIService {
  /**
   * Generate personalized recommendations for a user
   * @param {Number} userId - User ID
   * @param {Array} userReviews - User's past reviews
   * @param {Array} userCalendar - User's calendar entries
   * @param {Array} availableEvents - Available upcoming events
   * @returns {Array} - Recommended events with scores
   */
  async generateRecommendations(userId, userReviews, userCalendar, availableEvents) {
    try {
      // For now, this is a simplified recommendation algorithm
      // In a real application, this would integrate with an AI service or ML model
      
      // Track user preferences by category
      const categoryPreferences = {};
      
      // Analyze user reviews to determine preferences
      userReviews.forEach(review => {
        const category = review.category;
        if (!categoryPreferences[category]) {
          categoryPreferences[category] = { count: 0, totalRating: 0 };
        }
        
        categoryPreferences[category].count++;
        categoryPreferences[category].totalRating += review.rating;
      });
      
      // Calculate average rating per category
      Object.keys(categoryPreferences).forEach(category => {
        categoryPreferences[category].avgRating = 
          categoryPreferences[category].totalRating / categoryPreferences[category].count;
      });
      
      // Score available events based on preferences
      const recommendations = availableEvents.map(event => {
        const eventCategories = event.categories.split(',');
        let score = 0;
        let matchCount = 0;
        
        // Calculate recommendation score based on category preferences
        eventCategories.forEach(category => {
          if (categoryPreferences[category]) {
            // Higher weight for categories with higher ratings
            score += (categoryPreferences[category].avgRating / 5) * 0.8;
            score += (categoryPreferences[category].count / userReviews.length) * 0.2;
            matchCount++;
          }
        });
        
        // Adjust score based on category matches
        if (matchCount > 0) {
          score = score / matchCount;
        } else {
          // Default score for events with no matching categories
          score = 0.5;
        }
        
        // Add small random factor to prevent identical scores
        score += Math.random() * 0.1;
        
        // Ensure score is between 0 and 1
        score = Math.min(Math.max(score, 0), 1);
        
        let reason = '';
        if (score > 0.8) {
          reason = 'Highly matches your preferences';
        } else if (score > 0.6) {
          reason = 'Similar to events you enjoyed';
        } else if (score > 0.4) {
          reason = 'You might be interested in this';
        } else {
          reason = 'Recommended to diversify your experiences';
        }
        
        return {
          user_id: userId,
          event_id: event.id,
          score: score,
          reason: reason
        };
      });
      
      // Sort by score in descending order
      return recommendations.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error(`Error generating recommendations: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Analyze sentiment of a review
   * @param {String} content - Review content
   * @returns {Object} - Sentiment analysis results
   */
  async analyzeSentiment(content) {
    try {
      // Simple sentiment analysis based on keywords
      // In a real application, this would use a proper NLP service
      const positiveWords = ['great', 'excellent', 'amazing', 'good', 'wonderful', 'fantastic', 'enjoyed', 'love'];
      const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'disappointing', 'waste', 'hate', 'dislike'];
      
      const words = content.toLowerCase().split(/\W+/);
      let positiveScore = 0;
      let negativeScore = 0;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });
      
      const totalWords = words.length;
      const sentimentScore = (positiveScore - negativeScore) / (totalWords || 1);
      
      let sentimentCategory = 'neutral';
      if (sentimentScore > 0.05) sentimentCategory = 'positive';
      if (sentimentScore < -0.05) sentimentCategory = 'negative';
      
      return {
        sentimentScore: parseFloat(sentimentScore.toFixed(2)),
        sentimentCategory
      };
    } catch (error) {
      logger.error(`Error analyzing sentiment: ${error.message}`);
      return { sentimentScore: 0, sentimentCategory: 'neutral' };
    }
  }
  
  /**
   * Store recommendation feedback for model improvement
   * @param {Number} userId - User ID
   * @param {Number} eventId - Event ID
   * @param {String} feedback - Feedback (relevant/not_relevant)
   */
  async storeRecommendationFeedback(userId, eventId, feedback) {
    try {
      // In a real application, this would store feedback for model retraining
      logger.info(`Recommendation feedback stored: User ${userId}, Event ${eventId}, Feedback: ${feedback}`);
      return true;
    } catch (error) {
      logger.error(`Error storing recommendation feedback: ${error.message}`);
      return false;
    }
  }
}

module.exports = new AIService();const logger = require('../utils/logger');

/**
 * Service to handle AI-related functionalities
 */
class AIService {
  /**
   * Generate personalized recommendations for a user
   * @param {Number} userId - User ID
   * @param {Array} userReviews - User's past reviews
   * @param {Array} userCalendar - User's calendar entries
   * @param {Array} availableEvents - Available upcoming events
   * @returns {Array} - Recommended events with scores
   */
  async generateRecommendations(userId, userReviews, userCalendar, availableEvents) {
    try {
      // For now, this is a simplified recommendation algorithm
      // In a real application, this would integrate with an AI service or ML model
      
      // Track user preferences by category
      const categoryPreferences = {};
      
      // Analyze user reviews to determine preferences
      userReviews.forEach(review => {
        const category = review.category;
        if (!categoryPreferences[category]) {
          categoryPreferences[category] = { count: 0, totalRating: 0 };
        }
        
        categoryPreferences[category].count++;
        categoryPreferences[category].totalRating += review.rating;
      });
      
      // Calculate average rating per category
      Object.keys(categoryPreferences).forEach(category => {
        categoryPreferences[category].avgRating = 
          categoryPreferences[category].totalRating / categoryPreferences[category].count;
      });
      
      // Score available events based on preferences
      const recommendations = availableEvents.map(event => {
        const eventCategories = event.categories.split(',');
        let score = 0;
        let matchCount = 0;
        
        // Calculate recommendation score based on category preferences
        eventCategories.forEach(category => {
          if (categoryPreferences[category]) {
            // Higher weight for categories with higher ratings
            score += (categoryPreferences[category].avgRating / 5) * 0.8;
            score += (categoryPreferences[category].count / userReviews.length) * 0.2;
            matchCount++;
          }
        });
        
        // Adjust score based on category matches
        if (matchCount > 0) {
          score = score / matchCount;
        } else {
          // Default score for events with no matching categories
          score = 0.5;
        }
        
        // Add small random factor to prevent identical scores
        score += Math.random() * 0.1;
        
        // Ensure score is between 0 and 1
        score = Math.min(Math.max(score, 0), 1);
        
        let reason = '';
        if (score > 0.8) {
          reason = 'Highly matches your preferences';
        } else if (score > 0.6) {
          reason = 'Similar to events you enjoyed';
        } else if (score > 0.4) {
          reason = 'You might be interested in this';
        } else {
          reason = 'Recommended to diversify your experiences';
        }
        
        return {
          user_id: userId,
          event_id: event.id,
          score: score,
          reason: reason
        };
      });
      
      // Sort by score in descending order
      return recommendations.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error(`Error generating recommendations: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Analyze sentiment of a review
   * @param {String} content - Review content
   * @returns {Object} - Sentiment analysis results
   */
  async analyzeSentiment(content) {
    try {
      // Simple sentiment analysis based on keywords
      // In a real application, this would use a proper NLP service
      const positiveWords = ['great', 'excellent', 'amazing', 'good', 'wonderful', 'fantastic', 'enjoyed', 'love'];
      const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'disappointing', 'waste', 'hate', 'dislike'];
      
      const words = content.toLowerCase().split(/\W+/);
      let positiveScore = 0;
      let negativeScore = 0;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });
      
      const totalWords = words.length;
      const sentimentScore = (positiveScore - negativeScore) / (totalWords || 1);
      
      let sentimentCategory = 'neutral';
      if (sentimentScore > 0.05) sentimentCategory = 'positive';
      if (sentimentScore < -0.05) sentimentCategory = 'negative';
      
      return {
        sentimentScore: parseFloat(sentimentScore.toFixed(2)),
        sentimentCategory
      };
    } catch (error) {
      logger.error(`Error analyzing sentiment: ${error.message}`);
      return { sentimentScore: 0, sentimentCategory: 'neutral' };
    }
  }
  
  /**
   * Store recommendation feedback for model improvement
   * @param {Number} userId - User ID
   * @param {Number} eventId - Event ID
   * @param {String} feedback - Feedback (relevant/not_relevant)
   */
  async storeRecommendationFeedback(userId, eventId, feedback) {
    try {
      // In a real application, this would store feedback for model retraining
      logger.info(`Recommendation feedback stored: User ${userId}, Event ${eventId}, Feedback: ${feedback}`);
      return true;
    } catch (error) {
      logger.error(`Error storing recommendation feedback: ${error.message}`);
      return false;
    }
  }
}

module.exports = new AIService();