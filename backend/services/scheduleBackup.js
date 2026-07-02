const cron = require('node-cron');
const { createBackup } = require('./backupService');
const logger = require('../utils/logger');

// Every day at 2:00 AM
cron.schedule('0 2 * * *', async () => {
    try {
        logger.info('Starting automatic backup...');

        await createBackup();

        logger.info('Automatic backup completed.');
    } catch (error) {
        logger.error(error);
    }
});