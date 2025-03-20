const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all notifications for a user
router.get('/', notificationController.getUserNotifications);

// Get unread notifications count
router.get('/unread', notificationController.getUnreadCount);

// Create a new notification
router.post('/', notificationController.createNotification);

// Mark a notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

// Delete all read notifications
router.delete('/read', notificationController.deleteAllRead);

module.exports = router;