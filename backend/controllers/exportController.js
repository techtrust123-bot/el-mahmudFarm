/**
 * Export Controller
 * Handles data exports to CSV and other formats
 */

const { asyncHandler } = require('../middleware/errorHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');
const exportService = require('../services/exportService');
const { createAuditLog } = require('../middleware/auditLogger');

/**
 * Export livestock data
 */
const exportLivestock = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    const livestock = await farmModels.LiveStock.find().lean();

    if (!livestock || livestock.length === 0) {
      throw new ApiError(400, 'No livestock data to export');
    }

    const csvData = exportService.exportLivestock(livestock);

    await createAuditLog('EXPORT', 'livestock', {
      userId,
      farmId,
      req
    });

    res.header('Content-Type', csvData.mimeType);
    res.header('Content-Disposition', `attachment; filename="${csvData.filename}"`);
    res.header('Content-Length', csvData.fileSize);
    res.send(csvData.content);
  } catch (error) {
    throw new ApiError(500, 'Failed to export livestock data', error);
  }
});

/**
 * Export poultry data
 */
const exportPoultry = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    const poultry = await farmModels.Poultry.find().lean();

    if (!poultry || poultry.length === 0) {
      throw new ApiError(400, 'No poultry data to export');
    }

    const csvData = exportService.exportPoultry(poultry);

    await createAuditLog('EXPORT', 'poultry', {
      userId,
      farmId,
      req
    });

    res.header('Content-Type', csvData.mimeType);
    res.header('Content-Disposition', `attachment; filename="${csvData.filename}"`);
    res.header('Content-Length', csvData.fileSize);
    res.send(csvData.content);
  } catch (error) {
    throw new ApiError(500, 'Failed to export poultry data', error);
  }
});

/**
 * Export sales data
 */
const exportSales = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    const sales = await farmModels.Sells.find().lean();

    if (!sales || sales.length === 0) {
      throw new ApiError(400, 'No sales data to export');
    }

    const csvData = exportService.exportSales(sales);

    await createAuditLog('EXPORT', 'sales', {
      userId,
      farmId,
      req
    });

    res.header('Content-Type', csvData.mimeType);
    res.header('Content-Disposition', `attachment; filename="${csvData.filename}"`);
    res.header('Content-Length', csvData.fileSize);
    res.send(csvData.content);
  } catch (error) {
    throw new ApiError(500, 'Failed to export sales data', error);
  }
});

/**
 * Export expenses data
 */
const exportExpenses = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    const expenses = await farmModels.Expenses.find().lean();

    if (!expenses || expenses.length === 0) {
      throw new ApiError(400, 'No expense data to export');
    }

    const csvData = exportService.exportExpenses(expenses);

    await createAuditLog('EXPORT', 'expense', {
      userId,
      farmId,
      req
    });

    res.header('Content-Type', csvData.mimeType);
    res.header('Content-Disposition', `attachment; filename="${csvData.filename}"`);
    res.header('Content-Length', csvData.fileSize);
    res.send(csvData.content);
  } catch (error) {
    throw new ApiError(500, 'Failed to export expenses data', error);
  }
});

/**
 * Export feed data
 */
const exportFeed = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    const feed = await farmModels.Feed.find().lean();

    if (!feed || feed.length === 0) {
      throw new ApiError(400, 'No feed data to export');
    }

    const csvData = exportService.exportFeed(feed);

    await createAuditLog('EXPORT', 'feed', {
      userId,
      farmId,
      req
    });

    res.header('Content-Type', csvData.mimeType);
    res.header('Content-Disposition', `attachment; filename="${csvData.filename}"`);
    res.header('Content-Length', csvData.fileSize);
    res.send(csvData.content);
  } catch (error) {
    throw new ApiError(500, 'Failed to export feed data', error);
  }
});

/**
 * Export comprehensive farm report
 */
const exportFarmReport = asyncHandler(async (req, res) => {
  const { farmModels } = req;
  const userId = req.user.id;
  const farmId = req.user.farmId;

  try {
    // Gather all data
    const livestock = await farmModels.LiveStock.countDocuments();
    const poultry = await farmModels.Poultry.countDocuments();
    const staff = await farmModels.Staff?.countDocuments() || 0;

    const totalRevenue = await farmModels.Sells.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantitySold', '$pricePerUnit'] } }
        }
      }
    ]);

    const totalExpenses = await farmModels.Expenses.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const feedData = await farmModels.Feed.aggregate([
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const reportData = {
      farmId,
      managerName: req.user.name,
      livestock: {
        total: livestock
      },
      poultry: {
        total: poultry
      },
      financials: {
        revenue: totalRevenue[0]?.total || 0,
        expenses: totalExpenses[0]?.total || 0
      },
      feed: {
        totalQuantity: feedData[0]?.totalQuantity || 0
      },
      staff: {
        total: staff
      }
    };

    const report = exportService.generateFarmReport(reportData);

    await createAuditLog('EXPORT', 'farm_report', {
      userId,
      farmId,
      req
    });

    res.header('Content-Type', report.mimeType);
    res.header('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.header('Content-Length', report.fileSize);
    res.send(report.content);
  } catch (error) {
    throw new ApiError(500, 'Failed to generate farm report', error);
  }
});

module.exports = {
  exportLivestock,
  exportPoultry,
  exportSales,
  exportExpenses,
  exportFeed,
  exportFarmReport
};
