const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

/**
 * Email Service for sending notifications and system emails
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
    
    this.templates = {};
    this.initializeTemplates();
  }

  /**
   * Initialize email templates
   */
  async initializeTemplates() {
    try {
      // Define template paths
      const templateDir = path.join(__dirname, '../templates/email');
      const templates = [
        'welcome',
        'reset-password',
        'event-reminder',
        'new-review',
        'event-updates',
        'account-verification'
      ];
      
      // Load templates
      for (const template of templates) {
        const content = await fs.readFile(
          path.join(templateDir, `${template}.html`),
          'utf8'
        );
        this.templates[template] = handlebars.compile(content);
      }
      
      logger.info('Email templates loaded successfully');
    } catch (error) {
      logger.error('Failed to load email templates:', error);
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Promise<boolean>} - Success status
   */
  async sendEmail(options) {
    try {
      const { to, subject, template, data } = options;
      
      // Render template if provided
      let html = '';
      if (template && this.templates[template]) {
        html = this.templates[template](data);
      } else if (options.html) {
        html = options.html;
      } else {
        html = options.text || '';
      }
      
      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        text: options.text || '',
        html
      };
      
      // Add attachments if any
      if (options.attachments) {
        mailOptions.attachments = options.attachments;
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   * @param {Object} user - User object with email and username
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to EventReviews!',
      template: 'welcome',
      data: {
        username: user.username,
        loginUrl: `${config.frontendUrl}/login`
      }
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object with email
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
    
    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      data: {
        username: user.username,
        resetUrl,
        expiryTime: '1 hour'
      }
    });
  }

  /**
   * Send event reminder email
   * @param {Object} user - User object
   * @param {Object} event - Event object
   * @param {Object} reminder - Reminder settings
   * @returns {Promise<boolean>} - Success status
   */
  async sendEventReminderEmail(user, event, reminder) {
    return this.sendEmail({
      to: user.email,
      subject: `Reminder: ${event.title} is coming up!`,
      template: 'event-reminder',
      data: {
        username: user.username,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        eventUrl: `${config.frontendUrl}/events/${event.id}`,
        reminderTime: reminder.time
      }
    });
  }

  /**
   * Send notification about new review
   * @param {Object} user - User (organizer) object
   * @param {Object} event - Event object
   * @param {Object} review - Review object
   * @returns {Promise<boolean>} - Success status
   */
  async sendNewReviewNotification(user, event, review) {
    return this.sendEmail({
      to: user.email,
      subject: `New Review for ${event.title}`,
      template: 'new-review',
      data: {
        username: user.username,
        eventTitle: event.title,
        reviewRating: review.rating,
        reviewContent: review.content,
        eventUrl: `${config.frontendUrl}/events/${event.id}`,
        reviewerName: review.reviewerName
      }
    });
  }

  /**
   * Send batch emails (for newsletters or announcements)
   * @param {Array} recipients - Array of recipient user objects
   * @param {Object} emailData - Email data
   * @returns {Promise<Object>} - Results of sending batch emails
   */
  async sendBatchEmails(recipients, emailData) {
    const results = {
      successful: 0,
      failed: 0,
      failures: []
    };
    
    for (const recipient of recipients) {
      try {
        const sent = await this.sendEmail({
          to: recipient.email,
          subject: emailData.subject,
          template: emailData.template,
          data: {
            ...emailData.data,
            username: recipient.username
          }
        });
        
        if (sent) {
          results.successful++;
        } else {
          results.failed++;
          results.failures.push(recipient.email);
        }
      } catch (error) {
        logger.error(`Failed to send email to ${recipient.email}:`, error);
        results.failed++;
        results.failures.push(recipient.email);
      }
    }
    
    return results;
  }
}

module.exports = new EmailService();