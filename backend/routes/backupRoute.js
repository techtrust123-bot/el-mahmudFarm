const express = require('express');
const router = express.Router();
const { runNow } = require('../jobs/backupJob');
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere');
const { asyncHandler } = require('../middleware/errorHandler');
const { listBackups,createBackup } = require('../controllers/backupController');

/**
 * POST /api/backup/create
 * - Secured endpoint to create a new backup.
 * - Requires authenticated manager/admin user.
 */
router.post('/create', authMiddleware, isManager, asyncHandler(createBackup));

/**
 * POST /api/backup/run
 * - Secured endpoint to trigger manual backups.
 * - Requires authenticated manager/admin user.
 */
router.post('/run', authMiddleware, isManager, asyncHandler(async (req, res) => {
  // Trigger backup asynchronously but return accepted response quickly
  runNow().catch(() => {});
  res.status(202).json({ success: true, message: 'Backup triggered' });
}));
router.get('/list', authMiddleware, isManager,asyncHandler(listBackups) )

module.exports = router;
