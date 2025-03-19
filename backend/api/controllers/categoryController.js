const db = require('../../config/database');

exports.createCategory = async (req, res) => {
  try {
    // Only admins can create categories
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, description } = req.body;
    
    // Check if category already exists
    const [existingCategories] = await db.query(
      'SELECT * FROM categories WHERE name = ?',
      [name]
    );
    
    if (existingCategories.length > 0) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    // Insert new category
    const [result] = await db.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    
    res.status(201).json({
      id: result.insertId,
      name,
      description,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    // Get query parameters
    const { search, sort = 'name', order = 'asc' } = req.query;
    
    let query = 'SELECT * FROM categories';
    let params = [];
    
    // Add search filter if provided
    if (search) {
      query += ' WHERE name LIKE ? OR description LIKE ?';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }
    
    // Add sorting
    const validSortFields = ['name', 'created_at'];
    const validOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sort) ? sort : 'name';
    const sortOrder = validOrders.includes(order.toLowerCase()) ? order : 'asc';
    
    query += ` ORDER BY ${sortField} ${sortOrder}`;
    
    // Execute query
    const [categories] = await db.query(query, params);
    
    // Get event count for each category
    for (const category of categories) {
      const [countResult] = await db.query(`
        SELECT COUNT(*) as event_count
        FROM event_categories
        WHERE category_id = ?
      `, [category.id]);
      
      category.eventCount = countResult[0].event_count;
    }
    
    res.json(categories);
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get category
    const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    const category = categories[0];
    
    // Get event count for category
    const [countResult] = await db.query(
      'SELECT COUNT(*) as event_count FROM event_categories WHERE category_id = ?',
      [id]
    );
    
    category.eventCount = countResult[0].event_count;
    
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    // Only admins can update categories
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { id } = req.params;
    const { name, description } = req.body;
    
    // Check if category exists
    const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Check if name already exists for another category
    if (name) {
      const [existingCategories] = await db.query(
        'SELECT * FROM categories WHERE name = ? AND id != ?',
        [name, id]
      );
      
      if (existingCategories.length > 0) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
    }
    
    // Construct update query dynamically
    let updateFields = [];
    let queryParams = [];
    
    if (name) {
      updateFields.push('name = ?');
      queryParams.push(name);
    }
    
    if (description !== undefined) {
      updateFields.push('description = ?');
      queryParams.push(description);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Add category ID to params
    queryParams.push(id);
    
    const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`;
    
    await db.query(query, queryParams);
    
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    // Only admins can delete categories
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { id } = req.params;
    
    // Check if category exists
    const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Delete category - cascade will handle related records
    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCategoryEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    // Check if category exists
    const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    
    if (categories.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build query
    let query = `
      SELECT e.*, u.username as organizer_name
      FROM events e
      JOIN event_categories ec ON e.id = ec.event_id
      JOIN users u ON e.organizer_id = u.id
      WHERE ec.category_id = ?
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM events e
      JOIN event_categories ec ON e.id = ec.event_id
      WHERE ec.category_id = ?
    `;
    
    const queryParams = [id];
    
    // Add status filter if provided
    if (status) {
      query += ' AND e.status = ?';
      countQuery += ' AND e.status = ?';
      queryParams.push(status);
    }
    
    // Add sorting and pagination
    query += ' ORDER BY e.date DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    // Execute queries
    const [events] = await db.query(query, queryParams);
    const [countResult] = await db.query(countQuery, queryParams.slice(0, status ? 2 : 1));
    
    const total = countResult[0].total;
    
    res.json({
      events,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get category events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};