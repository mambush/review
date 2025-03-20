const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

// Public routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin routes
router.post('/', auth.authenticateUser, auth.authorizeAdmin, validation.validateCategoryCreation, categoryController.createCategory);
router.put('/:id', auth.authenticateUser, auth.authorizeAdmin, validation.validateCategoryUpdate, categoryController.updateCategory);
router.delete('/:id', auth.authenticateUser, auth.authorizeAdmin, categoryController.deleteCategory);

module.exports = router;