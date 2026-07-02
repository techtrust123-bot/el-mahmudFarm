/**
 * Export Service
 * Exports data to CSV and other formats
 */

const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

/**
 * Convert JSON to CSV
 */
const jsonToCSV = (data, filename) => {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Parse JSON to CSV
    const parser = new Parser();
    const csv = parser.parse(data);

    return {
      filename,
      content: csv,
      mimeType: 'text/csv'
    };
  } catch (error) {
    console.error('Error converting to CSV:', error);
    throw error;
  }
};

/**
 * Export livestock data
 */
const exportLivestock = (livestockData) => {
  const formattedData = livestockData.map(animal => ({
    Type: animal.type,
    Breed: animal.breed,
    Age: `${animal.age} years`,
    Weight: `${animal.weight} kg`,
    'Cost Price': `₦${animal.costPrice?.toLocaleString() || 0}`,
    'Tag Number': animal.tagNumber || 'N/A',
    'Health Status': animal.healthStatus || 'Good',
    'Date Added': new Date(animal.createdAt).toLocaleDateString(),
    Status: animal.status || 'Active'
  }));

  return jsonToCSV(formattedData, `livestock-${Date.now()}.csv`);
};

/**
 * Export poultry data
 */
const exportPoultry = (poultryData) => {
  const formattedData = poultryData.map(batch => ({
    Type: batch.type,
    Quantity: batch.quantity,
    'Purchase Price': `₦${batch.purchasePrice?.toLocaleString() || 0}`,
    'Purchase Date': batch.purchaseDate ? new Date(batch.purchaseDate).toLocaleDateString() : new Date(batch.joinDate).toLocaleDateString(),
    'Vaccination Status': batch.vaccinationStatus || 'Unknown',
    'Age (Days)': batch.ageInDays || 'N/A',
    Status: batch.status || 'Active'
  }));

  return jsonToCSV(formattedData, `poultry-${Date.now()}.csv`);
};

/**
 * Export sales data
 */
const exportSales = (salesData) => {
  const formattedData = salesData.map(sale => ({
    'Reference': sale.itemSold || sale.invoiceId || sale.tagNumber || sale.batchId || sale.animalType || 'N/A',
    Quantity: sale.quantitySold || sale.quantity || 0,
    'Unit Price': `₦${(sale.pricePerUnit || sale.sellingPrice)?.toLocaleString() || 0}`,
    'Total Amount': `₦${(sale.totalAmount || ((sale.quantitySold || sale.quantity || 0) * (sale.pricePerUnit || sale.sellingPrice || 0)))?.toLocaleString() || 0}`,
    'Sale Date': sale.date ? new Date(sale.date).toLocaleDateString() : (sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'),
    Description: sale.description || sale.itemSold || 'N/A'
  }));

  return jsonToCSV(formattedData, `sales-${Date.now()}.csv`);
};

/**
 * Export expenses data
 */
const exportExpenses = (expenseData) => {
  const formattedData = expenseData.map(expense => ({
    Title: expense.title || '',
    Category: expense.category || 'general',
    Amount: `₦${expense.amount?.toLocaleString() || 0}`,
    Description: expense.descriptions || expense.description || 'N/A',
    'Expense Date': expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A',
    'Recorded By': expense.recordedBy || 'N/A'
  }));

  return jsonToCSV(formattedData, `expenses-${Date.now()}.csv`);
};

/**
 * Export feed data
 */
const exportFeed = (feedData) => {
  const formattedData = feedData.map(feed => ({
    'Feed Type': feed.feedType,
    'Animal Type': feed.animalType,
    'Current Quantity': `${feed.quantity} kg`,
    'Unit Cost': `₦${(feed.unitCost || feed.cost)?.toLocaleString() || 0}`,
    'Daily Consumption': `${feed.dailyConsumption || feed.consumption || 0} kg`,
    'Total Cost': `₦${((feed.quantity || 0) * (feed.unitCost || feed.cost || 0))?.toLocaleString() || 0}`,
    'Last Updated': feed.lastConsumptionUpdate ? new Date(feed.lastConsumptionUpdate).toLocaleDateString() : (feed.updatedAt ? new Date(feed.updatedAt).toLocaleDateString() : 'N/A')
  }));

  return jsonToCSV(formattedData, `feed-${Date.now()}.csv`);
};

/**
 * Export financial summary
 */
const exportFinancialSummary = (summaryData) => {
  const formattedData = [{
    Category: 'Total Revenue',
    Amount: `₦${summaryData.totalRevenue?.toLocaleString() || 0}`,
    Period: summaryData.period || 'Current Month'
  },
  {
    Category: 'Total Expenses',
    Amount: `₦${summaryData.totalExpenses?.toLocaleString() || 0}`,
    Period: summaryData.period || 'Current Month'
  },
  {
    Category: 'Net Profit',
    Amount: `₦${(summaryData.totalRevenue - summaryData.totalExpenses)?.toLocaleString() || 0}`,
    Period: summaryData.period || 'Current Month'
  },
  {
    Category: 'Profit Margin',
    Amount: `${(((summaryData.totalRevenue - summaryData.totalExpenses) / summaryData.totalRevenue) * 100).toFixed(2)}%`,
    Period: summaryData.period || 'Current Month'
  }];

  return jsonToCSV(formattedData, `financial-summary-${Date.now()}.csv`);
};

/**
 * Generate comprehensive farm report
 */
const generateFarmReport = (reportData) => {
  const reportContent = `
CLOUDFARM COMPREHENSIVE REPORT
Generated: ${new Date().toLocaleString()}
Farm ID: ${reportData.farmId}
Manager: ${reportData.managerName}

=== LIVESTOCK SUMMARY ===
Total Animals: ${reportData.livestock?.total || 0}
By Type: ${JSON.stringify(reportData.livestock?.byType || {})}

=== POULTRY SUMMARY ===
Total Birds: ${reportData.poultry?.total || 0}
Broilers: ${reportData.poultry?.broilers || 0}
Layers: ${reportData.poultry?.layers || 0}

=== FINANCIAL SUMMARY ===
Total Revenue (Month): ₦${reportData.financials?.revenue?.toLocaleString() || 0}
Total Expenses (Month): ₦${reportData.financials?.expenses?.toLocaleString() || 0}
Net Profit: ₦${(reportData.financials?.revenue - reportData.financials?.expenses)?.toLocaleString() || 0}

=== FEED STATUS ===
Total Feed Inventory: ${reportData.feed?.totalQuantity || 0} kg
Low Stock Items: ${reportData.feed?.lowStockItems || 0}

=== STAFF ===
Total Staff: ${reportData.staff?.total || 0}
Active: ${reportData.staff?.active || 0}

Generated by CloudFarm - Your Digital Farm Management System
  `;

  return {
    filename: `farm-report-${Date.now()}.txt`,
    content: reportContent.trim(),
    mimeType: 'text/plain'
  };
};

module.exports = {
  exportLivestock,
  exportPoultry,
  exportSales,
  exportExpenses,
  exportFeed,
  exportFinancialSummary,
  generateFarmReport,
  jsonToCSV
};
