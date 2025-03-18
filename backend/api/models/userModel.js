const db = require('../../config/database');
const bcrypt = require('bcryptjs');

/**
 * User model
 */
const User = {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} - Created user object
   */
  async create(userData) {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Insert user into database
      const result = await db.query(
        `INSERT INTO users (username, email, password, bio, profile_pic) VALUES (?, ?, ?, ?, ?)`,
        [
          userData.username,
          userData.email,
          hashedPassword,
          userData.bio || null,
          userData.profile_pic || null
        ]
      );

      // Get the created user
      const [user] = await this.findById(result.insertId);
      return user;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Array} - User object array
   */
  async findById(id) {
    return await db.query(
      `SELECT id, username, email, bio, profile_pic, is_admin, created_at, updated_at FROM users WHERE id = ?`,
      [id]
    );
  },

  /**
   * Find user by email (includes password for authentication)
   * @param {string} email - User email
   * @returns {Array} - User object array with password
   */
  async findByEmail(email) {
    return await db.query(
      `SELECT id, username, email, password, bio, profile_pic, is_admin, created_at, updated_at FROM users WHERE email = ?`,
      [email]
    );
  },

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Array} - User object array
   */
  async findByUsername(username) {
    return await db.query(
      `SELECT id, username, email, bio, profile_pic, is_admin, created_at, updated_at FROM users WHERE username = ?`,
      [username]
    );
  },

  /**
   * Update user profile
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Object} - Updated user object
   */
  async update(id, userData) {
    // Create dynamic update query based on provided fields
    const fields = [];
    const values = [];

    if (userData.username) {
      fields.push('username = ?');
      values.push(userData.username);
    }
    if (userData.email) {
      fields.push('email = ?');
      values.push(userData.email);
    }
    if (userData.bio) {
      fields.push('bio = ?');
      values.push(userData.bio);
    }
    if (userData.profile_pic) {
      fields.push('profile_pic = ?');
      values.push(userData.profile_pic);
    }
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    // Only proceed if there are fields to update
    if (fields.length === 0) {
      return await this.findById(id);
    }

    // Add ID to values array
    values.push(id);

    // Execute update query
    await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Return updated user
    const [updatedUser] = await this.findById(id);
    return updatedUser;
  },

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {boolean} - Success status
   */
  async delete(id) {
    const result = await db.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Get all users
   * @param {Object} options - Query options (limit, offset)
   * @returns {Array} - Array of user objects
   */
  async getAll(options = { limit: 10, offset: 0 }) {
    return await db.query(
      `SELECT id, username, email, bio, profile_pic, is_admin, created_at, updated_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [options.limit, options.offset]
    );
  },

  /**
   * Change user role (admin/non-admin)
   * @param {number} id - User ID
   * @param {boolean} isAdmin - Admin status
   * @returns {Object} - Updated user object
   */
  async changeRole(id, isAdmin) {
    await db.query('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin, id]);
    const [updatedUser] = await this.findById(id);
    return updatedUser;
  },

  /**
   * Verify user password
   * @param {string} password - Plain password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {boolean} - Password match status
   */
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  },

  /**
   * Get user events
   * @param {number} userId - User ID
   * @param {string} type - Event type (organized, attended)
   * @returns {Array} - Array of event objects
   */
  async getUserEvents(userId, type = 'organized') {
    if (type === 'organized') {
      return await db.query(
        `SELECT e.* FROM events e
         WHERE e.organizer_id = ?
         ORDER BY e.date DESC`,
        [userId]
      );
    } else {
      return await db.query(
        `SELECT e.* FROM events e
         JOIN calendars c ON e.id = c.event_id
         WHERE c.user_id = ?
         ORDER BY e.date DESC`,
        [userId]
      );
    }
  },

  /**
   * Get user reviews
   * @param {number} userId - User ID
   * @returns {Array} - Array of review objects
   */
  async getUserReviews(userId) {
    return await db.query(
      `SELECT r.*, e.title as event_title FROM reviews r
       JOIN events e ON r.event_id = e.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
  },

  /**
   * Count users
   * @returns {number} - Total number of users
   */
  async count() {
    const [result] = await db.query('SELECT COUNT(*) as total FROM users');
    return result.total;
  }
};

module.exports = User;