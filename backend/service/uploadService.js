const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Service for handling file uploads (profile pictures, event images)
 */
class UploadService {
  constructor() {
    this.storage = this.configureStorage();
    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: this.fileFilter
    });
    
    // Configure AWS S3 if enabled
    if (config.storage.type === 's3') {
      this.s3 = new AWS.S3({
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
        region: config.storage.s3.region
      });
    }
  }

  /**
   * Configure storage based on config
   * @returns {multer.StorageEngine} - Configured storage engine
   */
  configureStorage() {
    if (config.storage.type === 'local') {
      // Local storage
      return multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = config.storage.local.uploadDir;
          // Create directory if it doesn't exist
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        }
      });
    } else {
      // For S3, use memory storage
      return multer.memoryStorage();
    }
  }

  /**
   * Filter files by type
   * @param {Object} req - Express request object
   * @param {Object} file - Uploaded file object
   * @param {Function} cb - Callback function
   */
  fileFilter(req, file, cb) {
    // Allow only images
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }

  /**
   * Get multer middleware for specific field
   * @param {string} fieldName - Form field name
   * @returns {Function} - Multer middleware
   */
  getUploadMiddleware(fieldName) {
    return this.upload.single(fieldName);
  }

  /**
   * Upload file to S3
   * @param {Object} file - File object from multer
   * @param {string} folder - Folder name in S3
   * @returns {Promise<string>} - File URL
   */
  async uploadToS3(file, folder = '') {
    try {
      const uniqueName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
      
      const params = {
        Bucket: config.storage.s3.bucket,
        Key: uniqueName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      
      const result = await this.s3.upload(params).promise();
      logger.info(`File uploaded to S3: ${result.Location}`);
      return result.Location;
    } catch (error) {
      logger.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Save file to local storage or S3
   * @param {Object} file - File object from multer
   * @param {string} folder - Folder name
   * @returns {Promise<string>} - File URL or path
   */
  async saveFile(file, folder = '') {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (config.storage.type === 's3') {
      return await this.uploadToS3(file, folder);
    } else {
      // For local storage, file already saved by multer
      return `${config.baseUrl}/uploads/${file.filename}`;
    }
  }

  /**
   * Delete file from storage
   * @param {string} fileUrl - URL or path of the file
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(fileUrl) {
    try {
      if (config.storage.type === 's3') {
        // Extract key from URL
        const key = fileUrl.split('/').slice(3).join('/');
        
        const params = {
          Bucket: config.storage.s3.bucket,
          Key: key
        };
        
        await this.s3.deleteObject(params).promise();
        logger.info(`File deleted from S3: ${key}`);
        return true;
      } else {
        // For local storage
        const filePath = path.join(
          config.storage.local.uploadDir,
          path.basename(fileUrl)
        );
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`File deleted from local storage: ${filePath}`);
          return true;
        }
        return false;
      }
    } catch (error) {
      logger.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Process event image upload
   * @param {Object} file - Uploaded file object
   * @returns {Promise<string>} - File URL
   */
  async processEventImage(file) {
    return this.saveFile(file, 'events');
  }

  /**
   * Process profile picture upload
   * @param {Object} file - Uploaded file object
   * @returns {Promise<string>} - File URL
   */
  async processProfilePicture(file) {
    return this.saveFile(file, 'profiles');
  }
}

module.exports = new UploadService();const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Service for handling file uploads (profile pictures, event images)
 */
class UploadService {
  constructor() {
    this.storage = this.configureStorage();
    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: this.fileFilter
    });
    
    // Configure AWS S3 if enabled
    if (config.storage.type === 's3') {
      this.s3 = new AWS.S3({
        accessKeyId: config.storage.s3.accessKeyId,
        secretAccessKey: config.storage.s3.secretAccessKey,
        region: config.storage.s3.region
      });
    }
  }

  /**
   * Configure storage based on config
   * @returns {multer.StorageEngine} - Configured storage engine
   */
  configureStorage() {
    if (config.storage.type === 'local') {
      // Local storage
      return multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = config.storage.local.uploadDir;
          // Create directory if it doesn't exist
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        }
      });
    } else {
      // For S3, use memory storage
      return multer.memoryStorage();
    }
  }

  /**
   * Filter files by type
   * @param {Object} req - Express request object
   * @param {Object} file - Uploaded file object
   * @param {Function} cb - Callback function
   */
  fileFilter(req, file, cb) {
    // Allow only images
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }

  /**
   * Get multer middleware for specific field
   * @param {string} fieldName - Form field name
   * @returns {Function} - Multer middleware
   */
  getUploadMiddleware(fieldName) {
    return this.upload.single(fieldName);
  }

  /**
   * Upload file to S3
   * @param {Object} file - File object from multer
   * @param {string} folder - Folder name in S3
   * @returns {Promise<string>} - File URL
   */
  async uploadToS3(file, folder = '') {
    try {
      const uniqueName = `${folder}/${uuidv4()}${path.extname(file.originalname)}`;
      
      const params = {
        Bucket: config.storage.s3.bucket,
        Key: uniqueName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      };
      
      const result = await this.s3.upload(params).promise();
      logger.info(`File uploaded to S3: ${result.Location}`);
      return result.Location;
    } catch (error) {
      logger.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Save file to local storage or S3
   * @param {Object} file - File object from multer
   * @param {string} folder - Folder name
   * @returns {Promise<string>} - File URL or path
   */
  async saveFile(file, folder = '') {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (config.storage.type === 's3') {
      return await this.uploadToS3(file, folder);
    } else {
      // For local storage, file already saved by multer
      return `${config.baseUrl}/uploads/${file.filename}`;
    }
  }

  /**
   * Delete file from storage
   * @param {string} fileUrl - URL or path of the file
   * @returns {Promise<boolean>} - Success status
   */
  async deleteFile(fileUrl) {
    try {
      if (config.storage.type === 's3') {
        // Extract key from URL
        const key = fileUrl.split('/').slice(3).join('/');
        
        const params = {
          Bucket: config.storage.s3.bucket,
          Key: key
        };
        
        await this.s3.deleteObject(params).promise();
        logger.info(`File deleted from S3: ${key}`);
        return true;
      } else {
        // For local storage
        const filePath = path.join(
          config.storage.local.uploadDir,
          path.basename(fileUrl)
        );
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info(`File deleted from local storage: ${filePath}`);
          return true;
        }
        return false;
      }
    } catch (error) {
      logger.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Process event image upload
   * @param {Object} file - Uploaded file object
   * @returns {Promise<string>} - File URL
   */
  async processEventImage(file) {
    return this.saveFile(file, 'events');
  }

  /**
   * Process profile picture upload
   * @param {Object} file - Uploaded file object
   * @returns {Promise<string>} - File URL
   */
  async processProfilePicture(file) {
    return this.saveFile(file, 'profiles');
  }
}

module.exports = new UploadService();