const db = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Get all calendar entries for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUserCalendarEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT c.*, e.title, e.description, e.date, e.time, e.location, e.status
      FROM calendars c
      JOIN events e ON c.event_id = e.id
      WHERE c.user_id = ?
      ORDER BY e.date, e.time
    `;
    
    const [entries] = await db.query(query, [userId]);
    
    return res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    logger.error(`Error getting user calendar entries: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Add an event to user's calendar
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.addToCalendar = async (req, res) => {
  try {
    const userId = req.user.id;
    const { event_id, reminder_settings, is_synced } = req.body;
    
    if (!event_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide event ID'
      });
    }
    
    // Check if event exists
    const [event] = await db.query('SELECT * FROM events WHERE id = ?', [event_id]);
    
    if (event.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if already added to calendar
    const [existing] = await db.query(
      'SELECT * FROM calendars WHERE user_id = ? AND event_id = ?',
      [userId, event_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Event already added to calendar'
      });
    }
    
    // Default reminder settings if not provided
    const defaultReminderSettings = JSON.stringify({
      remind: true,
      time: 60, // minutes before event
      method: "email"
    });
    
    const reminderJSON = reminder_settings 
      ? JSON.stringify(reminder_settings) 
      : defaultReminderSettings;
    
    const syncStatus = is_synced !== undefined ? is_synced : false;
    
    const query = `
      INSERT INTO calendars (user_id, event_id, reminder_settings, is_synced)
      VALUES (?, ?, ?, ?)
    `;
    
    const [result] = await db.query(query, [
      userId, 
      event_id, 
      reminderJSON, 
      syncStatus
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Could not add event to calendar'
      });
    }
    
    const [newEntry] = await db.query(
      'SELECT * FROM calendars WHERE id = ?',
      [result.insertId]
    );
    
    return res.status(201).json({
      success: true,
      data: newEntry[0]
    });
  } catch (error) {
    logger.error(`Error adding event to calendar: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Update calendar entry reminder settings
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.updateReminderSettings = async (req, res) => {
  try {
    const calendarId = req.params.id;
    const userId = req.user.id;
    const { reminder_settings } = req.body;
    
    if (!reminder_settings) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reminder settings'
      });
    }
    
    // Verify calendar entry belongs to user
    const [entry] = await db.query(
      'SELECT * FROM calendars WHERE id = ? AND user_id = ?',
      [calendarId, userId]
    );
    
    if (entry.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar entry not found or does not belong to user'
      });
    }
    
    const reminderJSON = JSON.stringify(reminder_settings);
    
    const query = `
      UPDATE calendars
      SET reminder_settings = ?
      WHERE id = ?
    `;
    
    await db.query(query, [reminderJSON, calendarId]);
    
    const [updated] = await db.query(
      'SELECT * FROM calendars WHERE id = ?',
      [calendarId]
    );
    
    return res.status(200).json({
      success: true,
      data: updated[0]
    });
  } catch (error) {
    logger.error(`Error updating reminder settings: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Update sync status of calendar entry
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.updateSyncStatus = async (req, res) => {
  try {
    const calendarId = req.params.id;
    const userId = req.user.id;
    const { is_synced } = req.body;
    
    if (is_synced === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide sync status'
      });
    }
    
    // Verify calendar entry belongs to user
    const [entry] = await db.query(
      'SELECT * FROM calendars WHERE id = ? AND user_id = ?',
      [calendarId, userId]
    );
    
    if (entry.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar entry not found or does not belong to user'
      });
    }
    
    const query = `
      UPDATE calendars
      SET is_synced = ?
      WHERE id = ?
    `;
    
    await db.query(query, [is_synced, calendarId]);
    
    return res.status(200).json({
      success: true,
      message: `Calendar entry sync status updated to ${is_synced}`
    });
  } catch (error) {
    logger.error(`Error updating sync status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Remove event from user's calendar
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.removeFromCalendar = async (req, res) => {
  try {
    const calendarId = req.params.id;
    const userId = req.user.id;
    
    // Verify calendar entry belongs to user
    const [entry] = await db.query(
      'SELECT * FROM calendars WHERE id = ? AND user_id = ?',
      [calendarId, userId]
    );
    
    if (entry.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Calendar entry not found or does not belong to user'
      });
    }
    
    await db.query('DELETE FROM calendars WHERE id = ?', [calendarId]);
    
    return res.status(200).json({
      success: true,
      message: 'Event removed from calendar'
    });
  } catch (error) {
    logger.error(`Error removing event from calendar: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Get upcoming events from user's calendar
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUpcomingEvents = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query; // Default to 7 days ahead
    
    const query = `
      SELECT c.*, e.title, e.description, e.date, e.time, e.location, e.status
      FROM calendars c
      JOIN events e ON c.event_id = e.id
      WHERE c.user_id = ? 
      AND e.date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY e.date, e.time
    `;
    
    const [events] = await db.query(query, [userId, parseInt(days)]);
    
    return res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    logger.error(`Error getting upcoming events: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};