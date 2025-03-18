/**
 * Collection of helper functions for the application
 */

/**
 * Formats a date to YYYY-MM-DD format
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  /**
   * Generates a random string for various purposes
   * @param {number} length - Length of the string
   * @returns {string} - Random string
   */
  const generateRandomString = (length = 10) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };
  
  /**
   * Paginates an array of results
   * @param {Array} array - The array to paginate
   * @param {number} page - The page number
   * @param {number} limit - Items per page
   * @returns {Object} - Paginated results
   */
  const paginate = (array, page = 1, limit = 10) => {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const results = {};
  
    if (endIndex < array.length) {
      results.next = {
        page: page + 1,
        limit
      };
    }
  
    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit
      };
    }
  
    results.totalPages = Math.ceil(array.length / limit);
    results.currentPage = page;
    results.totalItems = array.length;
    results.results = array.slice(startIndex, endIndex);
  
    return results;
  };
  
  /**
   * Validates if a string is a valid email
   * @param {string} email - Email to validate
   * @returns {boolean} - Is valid email
   */
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Removes sensitive fields from user object
   * @param {Object} user - User object
   * @returns {Object} - Sanitized user object
   */
   const sanitizeUser = (user) => {
    if (!user) return null;
    
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  };
  
  /**
   * Escapes special characters in strings for SQL queries
   * @param {string} text - Input text
   * @returns {string} - Escaped text
   */
  const escapeSQL = (text) => {
    if (typeof text !== 'string') return text;
    
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\0/g, '\\0');
  };
  
  module.exports = {
    formatDate,
    generateRandomString,
    paginate,
    isValidEmail,
    sanitizeUser,
    escapeSQL
  };