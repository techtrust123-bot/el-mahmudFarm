const express = require('express');
const {
  getDashboardOverview,
  getKPI,
  getLivestockAnalysis,
  getProfitLossStatement,
  getEmailActivityOverview,
  getAdminSalesSummary,
} = require('../controllers/dashboardController');
const { authMiddleware, isAdmin } = require('../middleweres/authMiddlewere');
const { checkSubscription } = require('../middleware/subscriptionMiddleware');
const { attachFarmDB } = require('../middleware/dbMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Dashboard routes
router.get('/overview', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(getDashboardOverview));
router.get('/kpi', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(getKPI));
router.get('/livestock-analysis', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(getLivestockAnalysis));
router.get('/profit-loss', authMiddleware, checkSubscription, attachFarmDB, asyncHandler(getProfitLossStatement));
router.get('/email-activity', authMiddleware, asyncHandler(getEmailActivityOverview));
router.get('/admin/sales-summary', authMiddleware, isAdmin, asyncHandler(getAdminSalesSummary));

module.exports = router;
