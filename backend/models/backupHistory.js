const mongoose = require('mongoose');
const backupHistorySchema = require('../schemas/backupHistory');

/**
 * BackupHistory model bound to the application's main mongoose connection.
 */
module.exports = mongoose.models.BackupHistory || mongoose.model('BackupHistory', backupHistorySchema);
