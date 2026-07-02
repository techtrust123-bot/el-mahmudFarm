/**
 * Backup Controller
 * Handles database backup and restoration
 */

const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');
const backupService = require('../services/backupService');
const { createAuditLog } = require('../middleware/auditLogger');

/**
 * Create a backup
 */
const createBackup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    const result = await backupService.createBackup({
      farmId,
      target: req.body?.target || req.query?.target || 'farm'
    });

    if (!result.success) {
      throw new ApiError(result.statusCode || 500, result.message || 'Backup creation failed');
    }

    await createAuditLog('BACKUP', 'database', {
      userId,
      farmId,
      req,
      after: result.data?.metadata
    });

    res.status(200).json(
      sendSuccess(200, result.data, result.message)
    );
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message || 'Failed to create backup', error);
  }
});

/**
 * Get list of available backups
 */
const listBackups = asyncHandler(async (req, res) => {
  try {
    const backups = await backupService.listBackups();

    const formattedBackups = backups.map(backup => ({
      name: backup.name,
      createdAt: backup.createdAt,
      size: backupService.formatBytes(backup.size || 0),
      farmId: backup.farmId
    }));

    res.status(200).json(
      sendSuccess(200, formattedBackups, 'Backups retrieved successfully')
    );
  } catch (error) {
    throw new ApiError(500, 'Failed to list backups', error);
  }
});

/**
 * Restore from backup
 */
const restoreBackup = asyncHandler(async (req, res) => {
  const { backupName } = req.body;
  const userId = req.user.id;
  const farmId = req.user.farmId;

  if (!backupName) {
    throw new ApiError(400, 'Backup name is required');
  }

  try {
    // WARNING: Restoration should be restricted to managers/admins only
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      throw new ApiError(403, 'Only managers can restore backups');
    }

    const result = await backupService.restoreBackup(backupName);

    if (!result.success) {
      throw new ApiError(result.statusCode || 500, result.message || 'Backup restoration failed');
    }

    await createAuditLog('RESTORE', 'database', {
      userId,
      farmId,
      req,
      after: { backupName, message: result.message }
    });

    res.status(200).json(
      sendSuccess(200, result.data, result.message)
    );
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message || 'Failed to restore backup', error);
  }
});

/**
 * Cleanup old backups
 */
const cleanupBackups = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    // Only admins can cleanup
    if (req.user.role !== 'admin') {
      throw new ApiError(403, 'Only admins can cleanup backups');
    }

    const result = await backupService.cleanupOldBackups(14);

    await createAuditLog('BACKUP_CLEANUP', 'database', {
      userId,
      farmId,
      req
    });

    res.status(200).json(
      sendSuccess(200, result.data, result.message)
    );
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message || 'Failed to cleanup backups', error);
  }
});

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupBackups
};
