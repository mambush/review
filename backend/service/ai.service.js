const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Claude AI API configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1/messages';

/**
 * Analyzes the sentiment of a review text using Claude AI
 * @param {string} text - The review text to analyze
 * @returns {Object} - Sentiment score and category
 */
exports.analyzeSentiment = async (text) => {
  try {
    // Simple fallback if API key not configured
    if (!CLAUDE_API_KEY) {
      console.warn('Claude API key not configured. Using fallback sentiment analysis.');
      return fallbackSentimentAnalysis(text);
    }
    
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Analyze the sentiment of this event review. Return only a JSON object with a 'score' (number between 0 and 1, where 0 is very negative and 1 is very positive) and a 'category' (one of: 'positive', 'neutral', 'negative').
            
            Review: "${text}"
            
            Response format:
            {
              "score": 0.XX,
              "category": "positive|neutral|negative"
            }`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    // Extract the JSON from Claude's response
    const content = response.data.content[0].text;
    
    // Parse the JSON response
    try {
      const parsedResult = JSON.parse(content);
      return {
        score: parsedResult.score,
        category: parsedResult.category
      };
    } catch (parseError) {
      console.error('Failed to parse Claude AI response:', parseError);
      return fallbackSentimentAnalysis(text);
    }
  } catch (error) {
    console.error('Claude API error:', error.response?.data || error.message);
    return fallbackSentimentAnalysis(text);
  }
};

/**
 * Simple fallback sentiment analysis for when API is not available
 * @param {string} text - The review text to analyze
 * @returns {Object} - Sentiment score and category
 */
function fallbackSentimentAnalysis(text) {
  const lowercaseText = text.toLowerCase();
  
  // Simple keyword-based sentiment analysis
  const positiveWords = ['great', 'amazing', 'excellent', 'good', 'love', 'best', 'awesome', 'enjoyed', 'recommend', 'fantastic', 'wonderful'];
  const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'hate', 'worst', 'disappointed', 'waste', 'horrible', 'avoid'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Count positive and negative keywords
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) {
      positiveCount += matches.length;
    }
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) {
      negativeCount += matches.length;
    }
  });
  
  const totalWordCount = text.split(/\s+/).length;
  let score;
  let category;
  
  if (positiveCount > negativeCount) {
    // More positive words than negative
    score = 0.5 + (0.5 * (positiveCount / (positiveCount + negativeCount + 1)));
    category = 'positive';
  } else if (negativeCount > positiveCount) {
    // More negative words than positive
    score = 0.5 - (0.5 * (negativeCount / (positiveCount + negativeCount + 1)));
    category = 'negative';
  } else {
    // Equal or no sentiment words
    score = 0.5;
    category = 'neutral';
  }
  
  return { score, category };
}

/**
 * Generates review summaries for events
 * @param {Array} reviews - Array of review objects
 * @returns {Object} - Summary insights
 */
exports.generateReviewSummary = async (reviews) => {
  try {
    if (!CLAUDE_API_KEY || reviews.length === 0) {
      return {
        averageRating: 0,
        sentimentBreakdown: {
          positive: 0,
          neutral: 0,
          negative: 0
        },
        summary: "No reviews available for summarization"
      };
    }

    // Extract review texts to analyze
    const reviewsText = reviews.map(review => {
      return `Rating: ${review.rating}/5\nReview: ${review.content}`;
    }).join("\n\n");

    // Calculate average rating
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    // Get sentiment breakdown
    const sentimentBreakdown = {
      positive: reviews.filter(r => r.sentiment_category === 'positive').length,
      neutral: reviews.filter(r => r.sentiment_category === 'neutral').length,
      negative: reviews.filter(r => r.sentiment_category === 'negative').length
    };

    // Generate summary using Claude
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Analyze the following event reviews and provide a concise summary of common themes, standout positive points, and areas for improvement:

            ${reviewsText}
            
            Format your response as a simple paragraph without using any special formatting or symbols.`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    // Extract the summary text
    const summaryText = response.data.content[0].text.trim();

    return {
      averageRating,
      sentimentBreakdown,
      summary: summaryText
    };
  } catch (error) {
    console.error('Error generating review summary:', error.response?.data || error.message);
    
    // Fallback summary if API fails
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    const sentimentBreakdown = {
      positive: reviews.filter(r => r.sentiment_category === 'positive').length,
      neutral: reviews.filter(r => r.sentiment_category === 'neutral').length,
      negative: reviews.filter(r => r.sentiment_category === 'negative').length
    };

    return {
      averageRating,
      sentimentBreakdown,
      summary: "Unable to generate detailed summary. Please check the system logs for more information."
    };
  }
};

/**
 * Generates personalized event recommendations for users
 * @param {Object} user - User object
 * @param {Array} events - Available events
 * @param {Array} userReviews - User's past reviews
 * @returns {Array} - Recommended events with scores and reasons
 */
exports.generateRecommendations = async (user, events, userReviews) => {
  try {
    if (!CLAUDE_API_KEY || events.length === 0) {
      return generateFallbackRecommendations(user, events, userReviews);
    }

    // Get user preferences based on past reviews and behavior
    const userPreferences = analyzeUserPreferences(userReviews);
    
    // Generate recommendations for each event
    const recommendations = [];
    
    for (const event of events) {
      // Calculate compatibility score between user and event
      const score = calculateCompatibilityScore(event, userPreferences);
      
      // Generate reason for recommendation
      const reason = generateRecommendationReason(event, userPreferences, score);
      
      recommendations.push({
        eventId: event.id,
        userId: user.id,
        score,
        reason
      });
    }
    
    // Sort by score (highest first) and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Return top 5 recommendations
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return generateFallbackRecommendations(user, events, userReviews);
  }
};

/**
 * Analyzes user preferences based on reviews
 * @param {Array} userReviews - User's past reviews
 * @returns {Object} - User preferences
 */
function analyzeUserPreferences(userReviews) {
  // Default preferences
  const preferences = {
    categories: {},
    avgRating: 0,
    positiveKeywords: [],
    negativeKeywords: []
  };
  
  if (!userReviews || userReviews.length === 0) {
    return preferences;
  }
  
  // Extract category preferences
  userReviews.forEach(review => {
    if (review.event && review.event.categories) {
      review.event.categories.forEach(category => {
        if (!preferences.categories[category.id]) {
          preferences.categories[category.id] = {
            count: 0,
            avgRating: 0
          };
        }
        
        preferences.categories[category.id].count++;
        preferences.categories[category.id].avgRating += review.rating;
      });
    }
  });
  
  // Calculate average rating per category
  Object.keys(preferences.categories).forEach(categoryId => {
    const category = preferences.categories[categoryId];
    category.avgRating = category.avgRating / category.count;
  });
  
  // Calculate overall average rating
  preferences.avgRating = userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length;
  
  // Extract keywords from reviews
  const allReviewText = userReviews.map(review => review.content).join(' ').toLowerCase();
  
  // Simple keyword extraction (can be improved)
  const positiveKeywords = ['great', 'amazing', 'excellent', 'good', 'love', 'best', 'awesome', 'enjoyed'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'poor', 'hate', 'worst', 'disappointed'];
  
  preferences.positiveKeywords = positiveKeywords.filter(word => allReviewText.includes(word));
  preferences.negativeKeywords = negativeKeywords.filter(word => allReviewText.includes(word));
  
  return preferences;
}

/**
 * Calculates compatibility score between event and user preferences
 * @param {Object} event - Event object
 * @param {Object} preferences - User preferences
 * @returns {Number} - Compatibility score (0-1)
 */
function calculateCompatibilityScore(event, preferences) {
  let score = 0.5; // Default neutral score
  
  // Category match
  let categoryScore = 0;
  if (event.categories && event.categories.length > 0) {
    event.categories.forEach(category => {
      if (preferences.categories[category.id]) {
        const catPref = preferences.categories[category.id];
        categoryScore += (catPref.avgRating / 5) * (catPref.count / 10);
      }
    });
    
    categoryScore = Math.min(categoryScore, 1) / event.categories.length;
    score += categoryScore * 0.4; // Category match is 40% of total score
  }
  
  // Rating match (how close is the event rating to user's average preferred rating)
  const ratingDiff = Math.abs(event.avg_rating - preferences.avgRating);
  const ratingScore = 1 - (ratingDiff / 5);
  score += ratingScore * 0.3; // Rating match is 30% of total score
  
  // Keyword match in event description
  const eventText = (event.title + ' ' + event.description).toLowerCase();
  let keywordScore = 0;
  
  preferences.positiveKeywords.forEach(keyword => {
    if (eventText.includes(keyword)) {
      keywordScore += 0.1;
    }
  });
  
  preferences.negativeKeywords.forEach(keyword => {
    if (eventText.includes(keyword)) {
      keywordScore -= 0.1;
    }
  });
  
  keywordScore = Math.max(-1, Math.min(1, keywordScore));
  score += (keywordScore + 1) / 2 * 0.3; // Normalize to 0-1 and account for 30% of score
  
  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Generates a reason for recommending an event
 * @param {Object} event - Event object
 * @param {Object} preferences - User preferences
 * @param {Number} score - Compatibility score
 * @returns {String} - Recommendation reason
 */
function generateRecommendationReason(event, preferences, score) {
  // Default reasons based on score ranges
  if (score > 0.8) {
    return `Highly matches your interests based on your ratings and reviews`;
  } else if (score > 0.6) {
    return `Similar to events you've enjoyed in the past`;
  } else if (score > 0.4) {
    return `You might find this event interesting`;
  } else {
    return `This event offers something different from your usual preferences`;
  }
}

/**
 * Generates fallback recommendations when AI API is not available
 * @param {Object} user - User object
 * @param {Array} events - Available events
 * @param {Array} userReviews - User's past reviews
 * @returns {Array} - Basic recommended events
 */
function generateFallbackRecommendations(user, events, userReviews) {
  // Simple recommendation logic: sort by highest rated events
  return events
    .slice(0, 10)
    .map(event => ({
      eventId: event.id,
      userId: user.id,
      score: event.avg_rating / 5, // Normalize to 0-1
      reason: "Based on event popularity and rating"
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Return top 5
}

/**
 * Updates the database with sentiment analysis results
 * @param {Object} db - Database connection
 * @param {number} reviewId - Review ID
 * @param {Object} sentiment - Sentiment analysis results
 * @returns {boolean} - Success status
 */
exports.updateReviewSentiment = async (db, reviewId, sentiment) => {
  try {
    await db.query(
      'UPDATE reviews SET sentiment_score = ?, sentiment_category = ?, updated_at = NOW() WHERE id = ?',
      [sentiment.score, sentiment.category, reviewId]
    );
    
    console.log(`Updated sentiment for review #${reviewId}: ${sentiment.category} (${sentiment.score})`);
    return true;
  } catch (error) {
    console.error(`Failed to update sentiment for review #${reviewId}:`, error);
    return false;
  }
};

/**
 * Processes batch sentiment analysis for multiple reviews
 * @param {Object} db - Database connection
 * @param {Array} reviews - Array of review objects
 * @returns {Object} - Processing results with success count
 */
exports.processBatchSentimentAnalysis = async (db, reviews) => {
  const results = {
    total: reviews.length,
    success: 0,
    failed: 0,
    details: []
  };
  
  for (const review of reviews) {
    try {
      // Skip reviews that already have sentiment analysis
      if (review.sentiment_score !== null && review.sentiment_category !== null) {
        results.details.push({
          reviewId: review.id,
          status: 'skipped',
          message: 'Sentiment already analyzed'
        });
        continue;
      }
      
      // Analyze sentiment
      const sentiment = await exports.analyzeSentiment(review.content);
      
      // Update database
      const success = await exports.updateReviewSentiment(db, review.id, sentiment);
      
      if (success) {
        results.success++;
        results.details.push({
          reviewId: review.id,
          status: 'success',
          sentiment
        });
      } else {
        results.failed++;
        results.details.push({
          reviewId: review.id,
          status: 'failed',
          message: 'Database update failed'
        });
      }
    } catch (error) {
      results.failed++;
      results.details.push({
        reviewId: review.id,
        status: 'error',
        message: error.message
      });
    }
  }
  
  return results;
};