// eventModel.js
const db = require('../../config/database');

/**
 * Event model
 */
const Event = {
  /**
   * Create a new event
   * @param {Object} eventData - Event data
   * @returns {Object} - Created event object
   */
  async create(eventData) {
    try {
      // Insert event into database
      const result = await db.query(
        `INSERT INTO events (title, description, date, time, location, organizer_id, image, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventData.title,
          eventData.description,
          eventData.date,
          eventData.time,
          eventData.location,
          eventData.organizer_id,
          eventData.image || null,
          eventData.status || 'upcoming'
        ]
      );

      const eventId = result.insertId;

      // Add event categories if provided
      if (eventData.categories && eventData.categories.length > 0) {
        const categoryValues = eventData.categories.map(categoryId => [eventId, categoryId]);
        await db.query(
          `INSERT INTO event_categories (event_id, category_id) VALUES ?`,
          [categoryValues]
        );
      }

      // Get the created event
      const [event] = await this.findById(eventId);
      return event;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find event by ID
   * @param {number} id - Event ID
   * @returns {Object} - Event object
   */
  async findById(id) {
    const [event] = await db.query(
      `SELECT * FROM events WHERE id = ?`,
      [id]
    );
    
    if (event) {
      // Get event categories
      event.categories = await this.getEventCategories(id);
    }
    
    return event;
  },

  /**
   * Get event categories
   * @param {number} eventId - Event ID
   * @returns {Array} - Array of category objects
   */
  async getEventCategories(eventId) {
    return await db.query(
      `SELECT c.* FROM categories c
       JOIN event_categories ec ON c.id = ec.category_id
       WHERE ec.event_id = ?`,
      [eventId]
    );
  },

  /**
   * Update event
   * @param {number} id - Event ID
   * @param {Object} eventData - Event data to update
   * @returns {Object} - Updated event object
   */
  async update(id, eventData) {
    // Create dynamic update query based on provided fields
    const fields = [];
    const values = [];

    if (eventData.title) {
      fields.push('title = ?');
      values.push(eventData.title);
    }
    if (eventData.description) {
      fields.push('description = ?');
      values.push(eventData.description);
    }
    if (eventData.date) {
      fields.push('date = ?');
      values.push(eventData.date);
    }
    if (eventData.time) {
      fields.push('time = ?');
      values.push(eventData.time);
    }
    if (eventData.location) {
      fields.push('location = ?');
      values.push(eventData.location);
    }
    if (eventData.image) {
      fields.push('image = ?');
      values.push(eventData.image);
    }
    if (eventData.status) {
      fields.push('status = ?');
      values.push(eventData.status);
    }

    // Only proceed if there are fields to update
    if (fields.length === 0) {
      return await this.findById(id);
    }

    // Add ID to values array
    values.push(id);

    // Execute update query
    await db.query(
      `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Update categories if provided
    if (eventData.categories && eventData.categories.length > 0) {
      // Remove existing categories
      await db.query('DELETE FROM event_categories WHERE event_id = ?', [id]);
      
      // Add new categories
      const categoryValues = eventData.categories.map(categoryId => [id, categoryId]);
      await db.query(
        `INSERT INTO event_categories (event_id, category_id) VALUES ?`,
        [categoryValues]
      );
    }

    // Return updated event
    const [updatedEvent] = await this.findById(id);
    return updatedEvent;
  },

  /**
   * Delete event
   * @param {number} id - Event ID
   * @returns {boolean} - Success status
   */
  async delete(id) {
    const result = await db.query('DELETE FROM events WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Get all events
   * @param {Object} options - Query options (limit, offset, filter, sort)
   * @returns {Array} - Array of event objects
   */
  async getAll(options = { limit: 10, offset: 0, filter: {}, sort: { by: 'date', order: 'ASC' } }) {
    let query = `SELECT * FROM events`;
    const queryParams = [];
    
    // Add filter conditions
    if (options.filter) {
      const filterConditions = [];
      
      if (options.filter.status) {
        filterConditions.push('status = ?');
        queryParams.push(options.filter.status);
      }
      
      if (options.filter.organizer_id) {
        filterConditions.push('organizer_id = ?');
        queryParams.push(options.filter.organizer_id);
      }
      
      if (options.filter.dateFrom) {
        filterConditions.push('date >= ?');
        queryParams.push(options.filter.dateFrom);
      }
      
      if (options.filter.dateTo) {
        filterConditions.push('date <= ?');
        queryParams.push(options.filter.dateTo);
      }
      
      if (options.filter.search) {
        filterConditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
        const searchTerm = `%${options.filter.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      if (filterConditions.length > 0) {
        query += ` WHERE ${filterConditions.join(' AND ')}`;
      }
    }
    
    // Add sorting
    if (options.sort) {
      query += ` ORDER BY ${options.sort.by} ${options.sort.order}`;
    }
    
    // Add pagination
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(options.limit, options.offset);
    
    const events = await db.query(query, queryParams);
    
    // Get categories for each event
    for (const event of events) {
      event.categories = await this.getEventCategories(event.id);
    }
    
    return events;
  },

  /**
   * Get events by category
   * @param {number} categoryId - Category ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Array} - Array of event objects
   */
  async getByCategory(categoryId, options = { limit: 10, offset: 0 }) {
    const events = await db.query(
      `SELECT e.* FROM events e
       JOIN event_categories ec ON e.id = ec.event_id
       WHERE ec.category_id = ?
       ORDER BY e.date ASC
       LIMIT ? OFFSET ?`,
      [categoryId, options.limit, options.offset]
    );
    
    // Get categories for each event
    for (const event of events) {
      event.categories = await this.getEventCategories(event.id);
    }
    
    return events;
  },

  /**
   * Update event rating
   * @param {number} eventId - Event ID
   * @returns {boolean} - Success status
   */
  async updateRating(eventId) {
    const [ratingResult] = await db.query(
      `SELECT AVG(rating) as avg_rating FROM reviews WHERE event_id = ?`,
      [eventId]
    );
    
    if (ratingResult && ratingResult.avg_rating !== null) {
      await db.query(
        `UPDATE events SET avg_rating = ? WHERE id = ?`,
        [ratingResult.avg_rating, eventId]
      );
      return true;
    }
    return false;
  },

  /**
   * Count events
   * @param {Object} filter - Filter options
   * @returns {number} - Total number of events
   */
  async count(filter = {}) {
    let query = `SELECT COUNT(*) as total FROM events`;
    const queryParams = [];
    
    // Add filter conditions
    if (filter) {
      const filterConditions = [];
      
      if (filter.status) {
        filterConditions.push('status = ?');
        queryParams.push(filter.status);
      }
      
      if (filter.organizer_id) {
        filterConditions.push('organizer_id = ?');
        queryParams.push(filter.organizer_id);
      }
      
      if (filterConditions.length > 0) {
        query += ` WHERE ${filterConditions.join(' AND ')}`;
      }
    }
    
    const [result] = await db.query(query, queryParams);
    return result.total;
  }
};

module.exports = Event;