const db = require('../../config/database');
const aiService = require('../../services/aiService');

exports.createReview = async (req, res) => {
  try {
    const { eventId, rating, content } = req.body;
    const userId = req.user.id;
    
    // Check if event exists
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user has already reviewed this event
    const [existingReviews] = await db.query(
      'SELECT * FROM reviews WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    
    if (existingReviews.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this event' });
    }
    
    // Analyze sentiment using AI service
    const sentimentAnalysis = await aiService.analyzeSentiment(content);
    const { score: sentimentScore, category: sentimentCategory } = sentimentAnalysis;
    
    // Insert review
    const [result] = await db.query(
      'INSERT INTO reviews (user_id, event_id, rating, content, sentiment_score, sentiment_category) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, eventId, rating, content, sentimentScore, sentimentCategory]
    );
    
    // Update event's average rating
    await updateEventAverageRating(eventId);
    
    // Create notification for event organizer
    const [eventDetails] = await db.query(
      'SELECT organizer_id, title FROM events WHERE id = ?',
      [eventId]
    );
    
    if (eventDetails.length > 0) {
      const organizerId = eventDetails[0].organizer_id;
      const eventTitle = eventDetails[0].title;
      
      await db.query(
        'INSERT INTO notifications (user_id, content, type, related_id) VALUES (?, ?, ?, ?)',
        [
          organizerId,
          `Your event "${eventTitle}" received a new ${rating}-star review`,
          'review',
          result.insertId
        ]
      );
    }
    
    res.status(201).json({
      id: result.insertId,
      userId,
      eventId,
      rating,
      content,
      sentimentScore,
      sentimentCategory,
      message: 'Review created successfully'
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEventReviews = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { sort = 'newest', page = 1, limit = 10 } = req.query;
    
    // Check if event exists
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Determine sort order
    let orderBy;
    switch (sort) {
      case 'oldest':
        orderBy = 'r.created_at ASC';
        break;
      case 'highest':
        orderBy = 'r.rating DESC, r.created_at DESC';
        break;
      case 'lowest':
        orderBy = 'r.rating ASC, r.created_at DESC';
        break;
      case 'newest':
      default:
        orderBy = 'r.created_at DESC';
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Get reviews with user information
    const [reviews] = await db.query(`
      SELECT r.*, u.username, u.profile_pic
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.event_id = ?
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [eventId, parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM reviews WHERE event_id = ?',
      [eventId]
    );
    
    const total = countResult[0].total;
    
    res.json({
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get event reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Get reviews with event information
    const [reviews] = await db.query(`
      SELECT r.*, e.title as event_title, e.date as event_date, e.image as event_image
      FROM reviews r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);
    
    // Get total count for pagination
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?',
      [userId]
    );
    
    const total = countResult[0].total;
    
    res.json({
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get review with user and event information
    const [reviews] = await db.query(`
      SELECT r.*, u.username, u.profile_pic, e.title as event_title
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
    `, [id]);
    
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json(reviews[0]);
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, content } = req.body;
    const userId = req.user.id;
    
    // Check if review exists and belongs to the user
    const [reviews] = await db.query(
      'SELECT * FROM reviews WHERE id = ?',
      [id]
    );
    
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    if (reviews[0].user_id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }
    
    // Update fields as needed
    let updateFields = [];
    let queryParams = [];
    
    if (rating) {
      updateFields.push('rating = ?');
      queryParams.push(rating);
    }
    
    if (content) {
      // Re-analyze sentiment if content is updated
      const sentimentAnalysis = await aiService.analyzeSentiment(content);
      const { score: sentimentScore, category: sentimentCategory } = sentimentAnalysis;
      
      updateFields.push('content = ?');
      queryParams.push(content);
      
      updateFields.push('sentiment_score = ?');
      queryParams.push(sentimentScore);
      
      updateFields.push('sentiment_category = ?');
      queryParams.push(sentimentCategory);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Add review ID to params
    queryParams.push(id);
    
    const query = `UPDATE reviews SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await db.query(query, queryParams);
    
    // Update event's average rating
    const eventId = reviews[0].event_id;
    await updateEventAverageRating(eventId);
    
    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if review exists and belongs to the user
    const [reviews] = await db.query(
      'SELECT * FROM reviews WHERE id = ?',
      [id]
    );
    
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    if (reviews[0].user_id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }
    
    // Store event ID before deleting the review
    const eventId = reviews[0].event_id;
    
    // Delete review
    await db.query('DELETE FROM reviews WHERE id = ?', [id]);
    
    // Update event's average rating
    await updateEventAverageRating(eventId);
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getReviewStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if event exists
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get review statistics
    const [reviewStats] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
        COUNT(CASE WHEN sentiment_category = 'positive' THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN sentiment_category = 'neutral' THEN 1 END) as neutral_reviews,
        COUNT(CASE WHEN sentiment_category = 'negative' THEN 1 END) as negative_reviews
      FROM reviews
      WHERE event_id = ?
    `, [eventId]);
    
    res.json(reviewStats[0]);
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to update event's average rating
async function updateEventAverageRating(eventId) {
  try {
    // Calculate new average rating
    const [avgResult] = await db.query(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE event_id = ?',
      [eventId]
    );
    
    const avgRating = avgResult[0].avg_rating || 0;
    
    // Update event's avg_rating
    await db.query(
      'UPDATE events SET avg_rating = ? WHERE id = ?',
      [avgRating, eventId]
    );
    
    return avgRating;
  } catch (error) {
    console.error('Update average rating error:', error);
    throw error;
  }
}