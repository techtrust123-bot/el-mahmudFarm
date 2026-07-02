const express = require('express');
const {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupBackups
} = require('../controllers/backupController');
const { authMiddleware, isManager } = require('../middleweres/authMiddlewere');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Backup routes (restricted to authenticated users)
router.post('/create', authMiddleware, asyncHandler(createBackup));
router.get('/list', authMiddleware, asyncHandler(listBackups));
router.post('/restore', authMiddleware, isManager, asyncHandler(restoreBackup));
router.post('/cleanup', authMiddleware, isManager, asyncHandler(cleanupBackups));

module.exports = router;
