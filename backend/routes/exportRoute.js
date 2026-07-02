const express = require('express');
const {
  exportLivestock,
  exportPoultry,
  exportSales,
  exportExpenses,
  exportFeed,
  exportFarmReport
} = require('../controllers/exportController');
const { authMiddleware } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { attachFarmDB } = require('../middleware/dbMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Export routes
router.get('/livestock', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(exportLivestock));
router.get('/poultry', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(exportPoultry));
router.get('/sales', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(exportSales));
router.get('/expenses', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(exportExpenses));
router.get('/feed', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(exportFeed));
router.get('/farm-report', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(exportFarmReport));

module.exports = router;
