// notificationModel.js
const db = require('../../config/database');

/**
 * Notification model
 */
const Notification = {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} - Created notification object
   */
  async create(notificationData) {
    try {
      // Insert notification into database
      const result = await db.query(
        `INSERT INTO notifications (user_id, content, type, related_id) VALUES (?, ?, ?, ?)`,
        [
          notificationData.user_id,
          notificationData.content,
          notificationData.type,
          notificationData.related_id || null
        ]
      );

      // Get the created notification
      const [notification] = await this.findById(result.insertId);
      return notification;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find notification by ID
   * @param {number} id - Notification ID
   * @returns {Object} - Notification object
   */
  async findById(id) {
    return await db.query(
      `SELECT * FROM notifications WHERE id = ?`,
      [id]
    );
  },

  /**
   * Mark notification as read
   * @param {number} id - Notification ID
   * @returns {boolean} - Success status
   */
  async markAsRead(id) {
    const result = await db.query(
      `UPDATE notifications SET read_status = TRUE WHERE id = ?`,
      [id]
    );
    
    return result.affectedRows > 0;
  },

  /**
   * Mark all user notifications as read
   * @param {number} userId - User ID
   * @returns {boolean} - Success status
   */
  async markAllAsRead(userId) {
    const result = await db.query(
      `UPDATE notifications SET read_status = TRUE WHERE user_id = ? AND read_status = FALSE`,
      [userId]
    );
    
    return result.affectedRows > 0;
  },

  /**
   * Delete notification
   * @param {number} id - Notification ID
   * @returns {boolean} - Success status
   */
  async delete(id) {
    const result = await db.query('DELETE FROM notifications WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Get user notifications
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset, unreadOnly)
   * @returns {Array} - Array of notification objects
   */
  async getUserNotifications(userId, options = { limit: 10, offset: 0, unreadOnly: false }) {
    let query = `SELECT * FROM notifications WHERE user_id = ?`;
    
    const queryParams = [userId];
    
    if (options.unreadOnly) {
      query += ' AND read_status = FALSE';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(options.limit, options.offset);
    
    return await db.query(query, queryParams);
  },

  /**
   * Get unread notifications count
   * @param {number} userId - User ID
   * @returns {number} - Count of unread notifications
   */

  // notificationModel.js (continuation)
  /**
   * Get unread notifications count
   * @param {number} userId - User ID
   * @returns {number} - Count of unread notifications
   */
  async getUnreadCount(userId) {
    const [result] = await db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = FALSE`,
      [userId]
    );
    
    return result.count;
  },

  /**
   * Create event notification for multiple users
   * @param {number} eventId - Event ID
   * @param {Array} userIds - Array of user IDs
   * @param {string} content - Notification content
   * @returns {number} - Number of notifications created
   */
  async createEventNotifications(eventId, userIds, content) {
    if (!userIds || userIds.length === 0) {
      return 0;
    }
    
    const values = userIds.map(userId => [userId, content, 'event', eventId]);
    
    const result = await db.query(
      `INSERT INTO notifications (user_id, content, type, related_id) VALUES ?`,
      [values]
    );
    
    return result.affectedRows;
  },

  /**
   * Create system notification for all users
   * @param {string} content - Notification content
   * @returns {number} - Number of notifications created
   */
  async createSystemNotificationForAll(content) {
    // Get all user IDs
    const users = await db.query('SELECT id FROM users');
    const userIds = users.map(user => user.id);
    
    if (userIds.length === 0) {
      return 0;
    }
    
    const values = userIds.map(userId => [userId, content, 'system', null]);
    
    const result = await db.query(
      `INSERT INTO notifications (user_id, content, type, related_id) VALUES ?`,
      [values]
    );
    
    return result.affectedRows;
  },

  /**
   * Delete old notifications
   * @param {number} days - Days to keep
   * @returns {number} - Number of notifications deleted
   */
  async deleteOldNotifications(days = 30) {
    const result = await db.query(
      `DELETE FROM notifications WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    
    return result.affectedRows;
  }
};

module.exports = Notification;