const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');

// Public routes
router.post('/register', validation.userRules.createUser, userController.register);
router.post('/login', validation.userRules.login, userController.login);

router.post('/forgot-password', 
  validation.validateEmail || ((req, res, next) => next()), 
  userController.forgotPassword || ((req, res) => res.status(501).json({ error: 'Not implemented' }))
);

router.post('/reset-password', 
  validation.validatePasswordReset || ((req, res, next) => next()), 
  userController.resetPassword || ((req, res) => res.status(501).json({ error: 'Not implemented' }))
);

// Protected routes
router.get('/profile', auth.authenticateUser, 
  userController.getProfile || ((req, res) => res.status(501).json({ error: 'User profile not implemented' }))
);

router.put('/profile', 
  auth.authenticateUser, 
  validation.userRules.updateUser, 
  userController.updateUserProfile || ((req, res) => res.status(501).json({ error: 'Update profile not implemented' }))
);

router.get('/profile/:id', 
  userController.getPublicUserProfile || ((req, res) => res.status(501).json({ error: 'Public profile not implemented' }))
);

router.delete('/account', 
  auth.authenticateUser, 
  userController.deleteAccount || ((req, res) => res.status(501).json({ error: 'Account deletion not implemented' }))
);

// Admin routes
router.get('/admin/users', 
  auth.authenticateUser, 
  auth.authorizeAdmin, 
  // Add fallback function in case getAllUsers is undefined
  (req, res) => {
    if (userController.getAllUsers) {
      return userController.getAllUsers(req, res);
    }
    res.status(501).json({ error: 'Get all users functionality not implemented' });
  }
);

router.put('/admin/users/:id', 
  auth.authenticateUser, 
  auth.authorizeAdmin, 
  validation.validateUserUpdate || validation.userRules.updateUser || ((req, res, next) => next()),
  userController.adminUpdateUser || ((req, res) => res.status(501).json({ error: 'Admin update user not implemented' }))
);

router.delete('/admin/users/:id', 
  auth.authenticateUser, 
  auth.authorizeAdmin, 
  userController.adminDeleteUser || ((req, res) => res.status(501).json({ error: 'Admin delete user not implemented' }))
);

module.exports = router;