const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all calendar entries for a user
router.get('/', calendarController.getUserCalendarEntries);

// Get upcoming events from calendar
router.get('/upcoming', calendarController.getUpcomingEvents);

// Add an event to user's calendar
router.post('/', calendarController.addToCalendar);

// Update reminder settings
router.put('/:id/reminder', calendarController.updateReminderSettings);

// Update sync status
router.put('/:id/sync', calendarController.updateSyncStatus);

// Remove event from calendar
router.delete('/:id', calendarController.removeFromCalendar);

module.exports = router;