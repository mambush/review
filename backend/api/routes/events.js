const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

// Public routes
router.get('/', eventController.getAllEvents);
router.get('/featured', eventController.getFeaturedEvents);
router.get('/search', eventController.searchEvents);
router.get('/:id', eventController.getEventById);
router.get('/category/:categoryId', eventController.getEventsByCategory);

// Protected routes
router.post('/', auth.authenticateUser, validation.validateEventCreation, eventController.createEvent);
router.put('/:id', auth.authenticateUser, validation.validateEventUpdate, eventController.updateEvent);
router.delete('/:id', auth.authenticateUser, eventController.deleteEvent);
router.get('/user/organized', auth.authenticateUser, eventController.getOrganizedEvents);
router.get('/user/attending', auth.authenticateUser, eventController.getAttendingEvents);
router.put('/:id/status', auth.authenticateUser, validation.validateEventStatusUpdate, eventController.updateEventStatus);
router.post('/:id/image', auth.authenticateUser, eventController.uploadEventImage);

// Admin routes
router.get('/admin/all', auth.authenticateUser, auth.authorizeAdmin, eventController.adminGetAllEvents);
router.put('/admin/events/:id', auth.authenticateUser, auth.authorizeAdmin, eventController.adminUpdateEvent);
router.delete('/admin/events/:id', auth.authenticateUser, auth.authorizeAdmin, eventController.adminDeleteEvent);

module.exports = router;