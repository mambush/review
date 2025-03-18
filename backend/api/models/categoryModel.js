// categoryModel.js
const db = require('../../config/database');

/**
 * Category model
 */
const Category = {
  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @returns {Object} - Created category object
   */
  async create(categoryData) {
    try {
      // Insert category into database
      const result = await db.query(
        `INSERT INTO categories (name, description) VALUES (?, ?)`,
        [categoryData.name, categoryData.description || null]
      );

      // Get the created category
      const [category] = await this.findById(result.insertId);
      return category;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Find category by ID
   * @param {number} id - Category ID
   * @returns {Object} - Category object
   */
  async findById(id) {
    return await db.query(
      `SELECT * FROM categories WHERE id = ?`,
      [id]
    );
  },

  /**
   * Find category by name
   * @param {string} name - Category name
   * @returns {Object} - Category object
   */
  async findByName(name) {
    return await db.query(
      `SELECT * FROM categories WHERE name = ?`,
      [name]
    );
  },

  /**
   * Update category
   * @param {number} id - Category ID
   * @param {Object} categoryData - Category data to update
   * @returns {Object} - Updated category object
   */
  async update(id, categoryData) {
    // Create dynamic update query based on provided fields
    const fields = [];
    const values = [];

    if (categoryData.name) {
      fields.push('name = ?');
      values.push(categoryData.name);
    }
    if (categoryData.description) {
      fields.push('description = ?');
      values.push(categoryData.description);
    }

    // Only proceed if there are fields to update
    if (fields.length === 0) {
      return await this.findById(id);
    }

    // Add ID to values array
    values.push(id);

    // Execute update query
    await db.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Return updated category
    const [updatedCategory] = await this.findById(id);
    return updatedCategory;
  },

  /**
   * Delete category
   * @param {number} id - Category ID
   * @returns {boolean} - Success status
   */
  async delete(id) {
    const result = await db.query('DELETE FROM categories WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Get all categories
   * @returns {Array} - Array of category objects
   */
  async getAll() {
    return await db.query('SELECT * FROM categories ORDER BY name ASC');
  },

  /**
   * Get categories with event count
   * @returns {Array} - Array of category objects with event count
   */
  async getAllWithEventCount() {
    return await db.query(
      `SELECT c.*, COUNT(ec.event_id) as event_count
       FROM categories c
       LEFT JOIN event_categories ec ON c.id = ec.category_id
       GROUP BY c.id
       ORDER BY c.name ASC`
    );
  },

  /**
   * Get popular categories
   * @param {number} limit - Number of categories to return
   * @returns {Array} - Array of popular category objects
   */
  async getPopular(limit = 5) {
    return await db.query(
      `SELECT c.*, COUNT(ec.event_id) as event_count
       FROM categories c
       JOIN event_categories ec ON c.id = ec.category_id
       GROUP BY c.id
       ORDER BY event_count DESC
       LIMIT ?`,
      [limit]
    );
  }
};

module.exports = Category;