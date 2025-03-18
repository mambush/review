// calendarModel.js
const db = require('../../config/database');

/**
 * Calendar model
 */
const Calendar = {
  /**
   * Add event to user's calendar
   * @param {Object} calendarData - Calendar data
   * @returns {Object} - Created calendar entry
   */
  async addEvent(calendarData) {
    try {
      // Define reminder settings JSON if provided
      let reminderSettings = null;
      if (calendarData.reminder_settings) {
        if (typeof calendarData.reminder_settings === 'string') {
          reminderSettings = calendarData.reminder_settings;
        } else {
          reminderSettings = JSON.stringify(calendarData.reminder_settings);
        }
      }

      // Insert calendar entry into database
      const result = await db.query(
        `INSERT INTO calendars (user_id, event_id, reminder_settings, is_synced) VALUES (?, ?, ?, ?)`,
        [
          calendarData.user_id,
          calendarData.event_id,
          reminderSettings,
          calendarData.is_synced || false
        ]
      );

      // Get the created calendar entry
      const [calendar] = await this.findById(result.insertId);
      return calendar;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find calendar entry by ID
   * @param {number} id - Calendar ID
   * @returns {Object} - Calendar object
   */
  async findById(id) {
    return await db.query(
      `SELECT c.*, e.title as event_title, e.date as event_date, e.time as event_time
       FROM calendars c
       JOIN events e ON c.event_id = e.id
       WHERE c.id = ?`,
      [id]
    );
  },

  /**
   * Find calendar entry by user and event
   * @param {number} userId - User ID
   * @param {number} eventId - Event ID
   * @returns {Object} - Calendar object
   */
  async findByUserAndEvent(userId, eventId) {
    return await db.query(
      `SELECT c.*, e.title as event_title, e.date as event_date, e.time as event_time
       FROM calendars c
       JOIN events e ON c.event_id = e.id
       WHERE c.user_id = ? AND c.event_id = ?`,
      [userId, eventId]
    );
  },

  /**
   * Update calendar entry
   * @param {number} id - Calendar ID
   * @param {Object} calendarData - Calendar data to update
   * @returns {Object} - Updated calendar object
   */
  async update(id, calendarData) {
    // Create dynamic update query based on provided fields
    const fields = [];
    const values = [];

    if (calendarData.reminder_settings) {
      let reminderSettings = null;
      if (typeof calendarData.reminder_settings === 'string') {
        reminderSettings = calendarData.reminder_settings;
      } else {
        reminderSettings = JSON.stringify(calendarData.reminder_settings);
      }
      
      fields.push('reminder_settings = ?');
      values.push(reminderSettings);
    }
    
    if (calendarData.is_synced !== undefined) {
      fields.push('is_synced = ?');
      values.push(calendarData.is_synced);
    }

    // Only proceed if there are fields to update
    if (fields.length === 0) {
      return await this.findById(id);
    }

    // Add ID to values array
    values.push(id);

    // Execute update query
    await db.query(
      `UPDATE calendars SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Return updated calendar entry
    const [updatedCalendar] = await this.findById(id);
    return updatedCalendar;
  },

  /**
   * Remove event from user's calendar
   * @param {number} id - Calendar ID
   * @returns {boolean} - Success status
   */
  async removeEvent(id) {
    const result = await db.query('DELETE FROM calendars WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Get user's calendar events
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset, filter)
   * @returns {Array} - Array of calendar objects
   */
  async getUserEvents(userId, options = { limit: 10, offset: 0, filter: {} }) {
    let query = `SELECT c.*, e.title, e.description, e.date, e.time, e.location, e.status, e.image
                 FROM calendars c
                 JOIN events e ON c.event_id = e.id
                 WHERE c.user_id = ?`;
    
    const queryParams = [userId];
    
    // Add filter conditions
    if (options.filter) {
      if (options.filter.dateFrom) {
        query += ' AND e.date >= ?';
        queryParams.push(options.filter.dateFrom);
      }
      
      if (options.filter.dateTo) {
        query += ' AND e.date <= ?';
        queryParams.push(options.filter.dateTo);
      }
      
      if (options.filter.status) {
        query += ' AND e.status = ?';
        queryParams.push(options.filter.status);
      }
    }
    
    // Add sorting and pagination
    query += ' ORDER BY e.date ASC, e.time ASC LIMIT ? OFFSET ?';
    queryParams.push(options.limit, options.offset);
    
    return await db.query(query, queryParams);
  },

  /**
   * Get upcoming events for reminder
   * @param {number} minutesAhead - Minutes ahead to look for events
   * @returns {Array} - Array of calendar objects with events coming up
   */
  async getUpcomingEvents(minutesAhead = 60) {
    const now = new Date();
    const targetDate = new Date(now.getTime() + minutesAhead * 60000);
    
    return await db.query(
      `SELECT c.*, e.title, e.date, e.time, e.location, u.email as user_email, u.username as user_name
       FROM calendars c
       JOIN events e ON c.event_id = e.id
       JOIN users u ON c.user_id = u.id
       WHERE e.date = CURDATE() 
       AND TIME_TO_SEC(TIMEDIFF(e.time, CURTIME())) BETWEEN 0 AND ?
       AND JSON_EXTRACT(c.reminder_settings, '$.enabled') = TRUE`,
      [minutesAhead * 60]
    );
  },

  /**
   * Check if user has added event to calendar
   * @param {number} userId - User ID
   * @param {number} eventId - Event ID
   * @returns {boolean} - True if event is in user's calendar
   */
  async hasEvent(userId, eventId) {
    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM calendars
       WHERE user_id = ? AND event_id = ?`,
      [userId, eventId]
    );
    
    return result.count > 0;
  }
};

module.exports = Calendar;