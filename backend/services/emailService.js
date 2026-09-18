/**
 * Email Notification Service
 * Sends alerts and notifications to users
 */

const trasporter = require('../nodemailer/trasporter');
const logger = require('../utils/logger');
const { lowFeedEmail } = require('../emails/lowFeed');
const { subscriptionExpiringEmail } = require('../emails/subscriptionExpiring');
const { unusualExpenseEmail } = require('../emails/unusualExpense');
const { animalHealthEmail } = require('../emails/animalHealth');
const { dailySummaryEmail } = require('../emails/dailySummary');
const { welcomeEmail } = require('../emails/welcome');
const { otpEmail } = require('../emails/otp');

const emailActivityLog = [];

const emailTemplates = {
  LOW_FEED_ALERT: (data = {}) => lowFeedEmail(data),
  SUBSCRIPTION_EXPIRING: (data = {}) => subscriptionExpiringEmail(data),
  UNUSUAL_EXPENSE: (data = {}) => unusualExpenseEmail(data),
  ANIMAL_HEALTH_ALERT: (data = {}) => animalHealthEmail(data),
  DAILY_SUMMARY: (data = {}) => dailySummaryEmail(data),
  WELCOME: (data = {}) => welcomeEmail(data),
  OTP: (data = {}) => otpEmail(data)
};

/**
 * Send email notification
 */
const sendNotification = async (email, type, data = {}) => {
  try {
    const template = emailTemplates[type];

    if (!template) {
      logger.warn(`Unknown email template: ${type}`);
      return false;
    }

    const emailContent = template({
      userName: 'User',
      ...data
    });

    const mailOptions = {
      from: process.env.SENDER_MAIL,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html
    };

    await trasporter.sendMail(mailOptions);
    emailActivityLog.push({
      type,
      recipient: email,
      subject: emailContent.subject,
      status: 'sent',
      createdAt: new Date().toISOString()
    });
    if (emailActivityLog.length > 100) {
      emailActivityLog.shift();
    }
    logger.info(`Email sent to ${email}: ${type}`);
    return true;
  } catch (error) {
    emailActivityLog.push({
      type,
      recipient: email,
      subject: type,
      status: 'failed',
      createdAt: new Date().toISOString(),
      error: error.message
    });
    logger.error('Error sending email:', error);
    return false;
  }
};

/**
 * Batch send notifications
 */
const sendBatchNotifications = async (recipients, type, data = {}) => {
  const results = await Promise.all(
    recipients.map(recipient =>
      sendNotification(recipient.email, type, {
        userName: recipient.name,
        ...data
      })
    )
  );
  return results;
};

const getEmailActivity = (limit = 10) => {
  return emailActivityLog
    .slice()
    .reverse()
    .slice(0, limit);
};

const sendPrivateMessage = async (email, subject, message) => {
  try {
    await trasporter.sendMail({
      from: process.env.SENDER_MAIL,
      to: email,
      subject,
      text: message,
      html: `<p>${String(message).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]))}</p>`,
    });
    return true;
  } catch (error) {
    logger.error('Error sending private message:', error);
    return false;
  }
};

module.exports = {
  sendNotification,
  sendBatchNotifications,
  emailTemplates,
  getEmailActivity
  ,sendPrivateMessage
};
