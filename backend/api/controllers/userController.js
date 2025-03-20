const db = require('../../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Use direct exports at the bottom instead of exporting functions individually
const register = async (req, res) => {
  try {
    const { username, email, password, bio } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, bio) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, bio || null]
    );
    
    // Generate token
    const token = jwt.sign(
      { id: result.insertId, username, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        username,
        email,
        bio: bio || null,
        isAdmin: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profile_pic,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [users] = await db.query('SELECT id, username, email, profile_pic, bio, is_admin, created_at FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      profilePic: user.profile_pic,
      bio: user.bio,
      isAdmin: user.is_admin,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, bio } = req.body;
    let profilePic = null;
    
    // If there's a file upload, get the path
    if (req.file) {
      profilePic = req.file.path;
    }
    
    // Check if username or email already exists for other users
    if (username || email) {
      const [existingUsers] = await db.query(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [username || '', email || '', userId]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({ message: 'Username or email already in use' });
      }
    }
    
    // Construct update query dynamically
    let updateFields = [];
    let queryParams = [];
    
    if (username) {
      updateFields.push('username = ?');
      queryParams.push(username);
    }
    
    if (email) {
      updateFields.push('email = ?');
      queryParams.push(email);
    }
    
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      queryParams.push(bio);
    }
    
    if (profilePic) {
      updateFields.push('profile_pic = ?');
      queryParams.push(profilePic);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Add userId to params
    queryParams.push(userId);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await db.query(query, queryParams);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPublicUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await db.query(
      'SELECT id, username, bio, profile_pic, created_at FROM users WHERE id = ?',
      [id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete user - cascade will handle related records
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const [users] = await db.query(
      'SELECT id, username, email, profile_pic, bio, is_admin, created_at FROM users'
    );
    
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const adminUpdateUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { id } = req.params;
    const { isAdmin, username, email, bio } = req.body;
    
    // Construct update query dynamically
    let updateFields = [];
    let queryParams = [];
    
    if (isAdmin !== undefined) {
      updateFields.push('is_admin = ?');
      queryParams.push(isAdmin);
    }
    
    if (username) {
      updateFields.push('username = ?');
      queryParams.push(username);
    }
    
    if (email) {
      updateFields.push('email = ?');
      queryParams.push(email);
    }
    
    if (bio !== undefined) {
      updateFields.push('bio = ?');
      queryParams.push(bio);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Add userId to params
    queryParams.push(id);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await db.query(query, queryParams);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const [users] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // For security reasons, don't reveal if email exists or not
      return res.json({ message: 'If your email is registered, you will receive a password reset link' });
    }
    
    // Generate a reset token
    const resetToken = jwt.sign(
      { id: users[0].id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // In a real application, you would send an email with the reset link
    // For this implementation, we'll just return the token
    
    // Store token in database (optional, depends on your implementation)
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [resetToken, users[0].id]
    );
    
    res.json({ 
      message: 'If your email is registered, you will receive a password reset link',
      // In a real application, you would NOT return the token to the API response
      // This is just for demonstration purposes
      resetToken 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if the token was created for password reset
      if (decoded.purpose !== 'password-reset') {
        return res.status(400).json({ message: 'Invalid token' });
      }
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Check if token exists in database (optional)
    const [users] = await db.query(
      'SELECT id FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > NOW()',
      [decoded.id, token]
    );
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password and clear reset token
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, decoded.id]
    );
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const adminDeleteUser = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { id } = req.params;
    
    // Check if the user exists
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user - cascade will handle related records
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Export all functions
module.exports = {
  register,
  login,
  getProfile,
  updateUserProfile,
  getPublicUserProfile,
  deleteAccount,
  getAllUsers,
  adminUpdateUser,
  forgotPassword,
  resetPassword,
  adminDeleteUser
};