/**
 * Backup Job
 * Runs daily backups of the database
 */

const cron = require('node-cron');
const backupService = require('../services/backupService');
const logger = require('../utils/logger');

// Schedule daily backups at 2:00 AM
const backupJob = cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Starting scheduled backup job');

    // Get list of all farms from MongoDB connections
    // In a real implementation, you'd query a list of active farms
    // For now, we'll backup the default database
    const result = backupService.createBackup('default');

    if (result.success) {
      logger.info('Backup completed successfully', { metadata: result.metadata });
    } else {
      logger.error('Backup failed', { error: result.error });
    }

    // Cleanup old backups (keep last 14 days)
    const cleanupResult = backupService.cleanupOldBackups(14);
    logger.info('Backup cleanup completed', { cleaned: cleanupResult.cleaned });
  } catch (error) {
    logger.error('Backup job error', { error: error.message, stack: error.stack });
  }
});

module.exports = backupJob;
