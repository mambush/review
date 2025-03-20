const db = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Get all notifications for a specific user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming auth middleware adds user to req
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `;
    
    const [notifications] = await db.query(query, [userId]);
    
    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    logger.error(`Error getting user notifications: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Get unread notifications count for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT COUNT(*) as unreadCount 
      FROM notifications 
      WHERE user_id = ? AND read_status = FALSE
    `;
    
    const [result] = await db.query(query, [userId]);
    
    return res.status(200).json({
      success: true,
      unreadCount: result[0].unreadCount
    });
  } catch (error) {
    logger.error(`Error getting unread notification count: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Create a new notification
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.createNotification = async (req, res) => {
  try {
    const { user_id, content, type, related_id } = req.body;
    
    if (!user_id || !content || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    const query = `
      INSERT INTO notifications (user_id, content, type, related_id)
      VALUES (?, ?, ?, ?)
    `;
    
    const [result] = await db.query(query, [user_id, content, type, related_id || null]);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notification could not be created'
      });
    }
    
    const [newNotification] = await db.query(
      'SELECT * FROM notifications WHERE id = ?',
      [result.insertId]
    );
    
    return res.status(201).json({
      success: true,
      data: newNotification[0]
    });
  } catch (error) {
    logger.error(`Error creating notification: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Mark a notification as read
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    // Verify notification belongs to the user
    const [notification] = await db.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or does not belong to user'
      });
    }
    
    const query = `
      UPDATE notifications 
      SET read_status = TRUE 
      WHERE id = ?
    `;
    
    await db.query(query, [notificationId]);
    
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error(`Error marking notification as read: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Mark all notifications as read for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      UPDATE notifications 
      SET read_status = TRUE 
      WHERE user_id = ? AND read_status = FALSE
    `;
    
    const [result] = await db.query(query, [userId]);
    
    return res.status(200).json({
      success: true,
      message: `${result.affectedRows} notifications marked as read`
    });
  } catch (error) {
    logger.error(`Error marking all notifications as read: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Delete a notification
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    
    // Verify notification belongs to the user
    const [notification] = await db.query(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    if (notification.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or does not belong to user'
      });
    }
    
    await db.query('DELETE FROM notifications WHERE id = ?', [notificationId]);
    
    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting notification: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

/**
 * Delete all read notifications for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.deleteAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [result] = await db.query(
      'DELETE FROM notifications WHERE user_id = ? AND read_status = TRUE',
      [userId]
    );
    
    return res.status(200).json({
      success: true,
      message: `${result.affectedRows} read notifications deleted`
    });
  } catch (error) {
    logger.error(`Error deleting read notifications: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};