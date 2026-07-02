/**
 * Dashboard Controller
 * Provides farm overview metrics and statistics
 */

const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');
const { getEmailActivity } = require('../services/emailService');

/**
 * Get dashboard overview
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const userId = req.user.id;

  try {
    // Get livestock stats
    const livestockCount = await farmModels.LiveStock.countDocuments();
    const livestockByType = await farmModels.LiveStock.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get poultry stats
    const poultryCount = await farmModels.Poultry.countDocuments();
    const poultryStats = await farmModels.Poultry.aggregate([
      { $group: { _id: '$type', quantity: { $sum: '$quantity' } } }
    ]);

    // Get sales stats (current month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const totalRevenue = await farmModels.Sells.aggregate([
      {
        $match: { date: { $gte: startOfMonth } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantitySold', '$pricePerUnit'] } }
        }
      }
    ]);

    // Get expense stats (current month)
    const totalExpenses = await farmModels.Expenses.aggregate([
      {
        $match: { date: { $gte: startOfMonth } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get feed stats
    const feedStats = await farmModels.Feed.aggregate([
      {
        $group: {
          _id: '$animalType',
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: { $multiply: ['$quantity', '$cost'] } }
        }
      }
    ]);

    // Get recent sales
    const recentSales = await farmModels.Sells.find()
      .sort({ date: -1 })
      .limit(5)
      .lean();

    // Get recent expenses
    const recentExpenses = await farmModels.Expenses.find()
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const revenue = totalRevenue[0]?.total || 0;
    const expenses = totalExpenses[0]?.total || 0;

    const overview = {
      livestock: {
        total: livestockCount,
        byType: livestockByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      poultry: {
        total: poultryCount,
        byType: poultryStats.reduce((acc, item) => {
          acc[item._id] = item.quantity;
          return acc;
        }, {})
      },
      financials: {
        revenue,
        expenses,
        profit: revenue - expenses,
        profitMargin: revenue > 0 ? ((revenue - expenses) / revenue * 100).toFixed(2) : 0,
        period: `${startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`
      },
      feed: feedStats,
      recentActivity: {
        sales: recentSales,
        expenses: recentExpenses
      }
    };

    res.status(200).json(
      sendSuccess(200, overview, 'Dashboard data retrieved successfully')
    );
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch dashboard data', error);
  }
});

/**
 * Get key performance indicators
 */
const getKPI = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    // Sales trend
    const salesTrend = await farmModels.Sells.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          revenue: { $sum: { $multiply: ['$quantitySold', '$pricePerUnit'] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Expense trend
    const expenseTrend = await farmModels.Expenses.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          expenses: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Feed consumption rate
    const feedConsumption = await farmModels.Feed.aggregate([
      {
        $group: {
          _id: '$animalType',
          dailyConsumption: { $sum: { $ifNull: ['$dailyConsumption', '$consumption'] } },
          daysSupply: {
            $avg: {
              $divide: ['$quantity', { $max: [{ $ifNull: ['$dailyConsumption', '$consumption'] }, 1] }]
            }
          }
        }
      }
    ]);

    // Animal mortality (if tracked)
    const animalHealth = {
      livestockHealthy: await farmModels.LiveStock.countDocuments({ healthStatus: 'healthy' }),
      livestockSick: await farmModels.LiveStock.countDocuments({ healthStatus: 'sick' }),
      poultryHealthy: await farmModels.Poultry.countDocuments({ healthStatus: 'healthy' }),
      poultryMortalityThisMonth: 0 // Implement if mortality tracking exists
    };

    const kpi = {
      salesTrend,
      expenseTrend,
      feedConsumption,
      animalHealth,
      period: `Last ${days} days`
    };

    res.status(200).json(
      sendSuccess(200, kpi, 'KPI data retrieved successfully')
    );
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch KPI data', error);
  }
});

/**
 * Get livestock details
 */
const getLivestockAnalysis = asyncHandler(async (req, res) => {
  const { farmModels } = req;

  try {
    const analysis = await farmModels.LiveStock.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgAge: { $avg: '$age' },
          avgWeight: { $avg: '$weight' },
          totalCostInvested: { $sum: '$costPrice' },
          healthStatus: {
            $push: '$healthStatus'
          }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgAge: { $round: ['$avgAge', 2] },
          avgWeight: { $round: ['$avgWeight', 2] },
          totalCostInvested: 1,
          healthyCount: {
            $size: {
              $filter: {
                input: '$healthStatus',
                as: 'status',
                cond: { $eq: ['$$status', 'healthy'] }
              }
            }
          }
        }
      }
    ]);

    res.status(200).json(
      sendSuccess(200, analysis, 'Livestock analysis retrieved successfully')
    );
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch livestock analysis', error);
  }
});

/**
 * Get profit & loss statement
 */
const getProfitLossStatement = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const month = req.query.month || new Date().getMonth();
  const year = req.query.year || new Date().getFullYear();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  try {
    // Revenue
    const revenue = await farmModels.Sells.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantitySold', '$pricePerUnit'] } }
        }
      }
    ]);

    // Expenses by category
    const expensesByCategory = await farmModels.Expenses.aggregate([
      {
        $match: {
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' }
        }
      }
    ]);

    const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0);
    const totalRevenue = revenue[0]?.total || 0;

    const pnl = {
      period: `${startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      revenue: totalRevenue,
      expensesByCategory,
      totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(2) : 0
    };

    res.status(200).json(
      sendSuccess(200, pnl, 'P&L statement retrieved successfully')
    );
  } catch (error) {
    throw new ApiError(500, 'Failed to fetch P&L statement', error);
  }
});

const getEmailActivityOverview = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }

  const limit = parseInt(req.query.limit) || 10;
  const activity = getEmailActivity(limit);

  res.status(200).json(
    sendSuccess(200, activity, 'Email activity retrieved successfully')
  );
});

module.exports = {
  getDashboardOverview,
  getKPI,
  getLivestockAnalysis,
  getProfitLossStatement,
  getEmailActivityOverview
};
