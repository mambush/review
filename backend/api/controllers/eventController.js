const db = require('../../config/database');

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, categoryIds } = req.body;
    const organizerId = req.user.id;
    let image = null;
    
    // If there's an image upload, get the path
    if (req.file) {
      image = req.file.path;
    }
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Insert event
      const [eventResult] = await connection.query(
        'INSERT INTO events (title, description, date, time, location, organizer_id, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [title, description, date, time, location, organizerId, image]
      );
      
      const eventId = eventResult.insertId;
      
      // Insert event categories if provided
      if (categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0) {
        const categoryValues = categoryIds.map(categoryId => [eventId, categoryId]);
        await connection.query(
          'INSERT INTO event_categories (event_id, category_id) VALUES ?',
          [categoryValues]
        );
      }
      
      await connection.commit();
      
      res.status(201).json({
        id: eventId,
        title,
        description,
        date,
        time,
        location,
        organizerId,
        image,
        status: 'upcoming',
        avgRating: 0,
        message: 'Event created successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const { 
      category, 
      status, 
      organizer, 
      search,
      sortBy = 'date', 
      sortDir = 'asc',
      page = 1,
      limit = 10
    } = req.query;
    
    let query = `
      SELECT e.*, u.username as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM events e';
    let whereConditions = [];
    let params = [];
    
    // Add category filter if provided
    if (category) {
      query += ' JOIN event_categories ec ON e.id = ec.event_id';
      countQuery += ' JOIN event_categories ec ON e.id = ec.event_id';
      whereConditions.push('ec.category_id = ?');
      params.push(category);
    }
    
    // Add status filter if provided
    if (status) {
      whereConditions.push('e.status = ?');
      params.push(status);
    }
    
    // Add organizer filter if provided
    if (organizer) {
      whereConditions.push('e.organizer_id = ?');
      params.push(organizer);
    }
    
    // Add search filter if provided
    if (search) {
      whereConditions.push('(e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    // Add GROUP BY to handle joins causing duplicate rows
    query += ' GROUP BY e.id';
    
    // Add sorting
    const validSortFields = ['date', 'title', 'avg_rating', 'created_at'];
    const validSortDirs = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
    const sortDirection = validSortDirs.includes(sortDir.toLowerCase()) ? sortDir : 'asc';
    
    query += ` ORDER BY e.${sortField} ${sortDirection}`;
    
    // Add pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    // Execute queries
    const [events] = await db.query(query, params);
    const [countResult] = await db.query(countQuery, params.slice(0, params.length - 2));
    
    // Get categories for each event
    for (const event of events) {
      const [categories] = await db.query(`
        SELECT c.id, c.name
        FROM categories c
        JOIN event_categories ec ON c.id = ec.category_id
        WHERE ec.event_id = ?
      `, [event.id]);
      
      event.categories = categories;
    }
    
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
    console.error('Get all events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get event details
    const [events] = await db.query(`
      SELECT e.*, u.username as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
    `, [id]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    const event = events[0];
    
    // Get event categories
    const [categories] = await db.query(`
      SELECT c.id, c.name
      FROM categories c
      JOIN event_categories ec ON c.id = ec.category_id
      WHERE ec.event_id = ?
    `, [id]);
    
    event.categories = categories;
    
    // Get review stats
    const [reviewStats] = await db.query(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN sentiment_category = 'positive' THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN sentiment_category = 'neutral' THEN 1 END) as neutral_reviews,
        COUNT(CASE WHEN sentiment_category = 'negative' THEN 1 END) as negative_reviews
      FROM reviews
      WHERE event_id = ?
    `, [id]);
    
    event.reviewStats = reviewStats[0];
    
    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, location, status, categoryIds } = req.body;
    let image = null;
    
    // If there's an image upload, get the path
    if (req.file) {
      image = req.file.path;
    }
    
    // Check if event exists and user is organizer or admin
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (events[0].organizer_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Construct update query dynamically
      let updateFields = [];
      let queryParams = [];
      
      if (title) {
        updateFields.push('title = ?');
        queryParams.push(title);
      }
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        queryParams.push(description);
      }
      
      if (date) {
        updateFields.push('date = ?');
        queryParams.push(date);
      }
      
      if (time) {
        updateFields.push('time = ?');
        queryParams.push(time);
      }
      
      if (location) {
        updateFields.push('location = ?');
        queryParams.push(location);
      }
      
      if (status) {
        updateFields.push('status = ?');
        queryParams.push(status);
      }
      
      if (image) {
        updateFields.push('image = ?');
        queryParams.push(image);
      }
      
      if (updateFields.length > 0) {
        // Add event ID to params
        queryParams.push(id);
        
        const query = `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`;
        await connection.query(query, queryParams);
      }
      
      // Update categories if provided
      if (categoryIds && Array.isArray(categoryIds)) {
        // Delete existing categories
        await connection.query('DELETE FROM event_categories WHERE event_id = ?', [id]);
        
        // Insert new categories
        if (categoryIds.length > 0) {
          const categoryValues = categoryIds.map(categoryId => [id, categoryId]);
          await connection.query(
            'INSERT INTO event_categories (event_id, category_id) VALUES ?',
            [categoryValues]
          );
        }
      }
      
      await connection.commit();
      
      res.json({ message: 'Event updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if event exists and user is organizer or admin
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (events[0].organizer_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }
    
    // Delete event - cascade will handle related records
    await db.query('DELETE FROM events WHERE id = ?', [id]);
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserEvents = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    const [events] = await db.query(`
      SELECT e.*, u.username as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.organizer_id = ?
      ORDER BY e.date DESC
    `, [userId]);
    
    // Get categories for each event
    for (const event of events) {
      const [categories] = await db.query(`
        SELECT c.id, c.name
        FROM categories c
        JOIN event_categories ec ON c.id = ec.category_id
        WHERE ec.event_id = ?
      `, [event.id]);
      
      event.categories = categories;
    }
    
    res.json(events);
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Check if event exists and user is organizer or admin
    const [events] = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    
    if (events.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    if (events[0].organizer_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    // Update status
    await db.query('UPDATE events SET status = ? WHERE id = ?', [status, id]);
    
    res.json({ message: 'Event status updated successfully' });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};