/**
 * Export Service
 * Exports data to CSV and plain text formats with metadata and reusable formatting.
 */

const { Parser } = require('json2csv');
const logger = require('../utils/logger');

const CSV_MIME_TYPE = 'text/csv';
const TEXT_MIME_TYPE = 'text/plain';

const numberFormatter = new Intl.NumberFormat('en-NG', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0
});

/**
 * Convert a value into a Date object, returning null for invalid values.
 * @param {*} value
 * @returns {Date|null}
 */
const parseDate = (value) => {
  if (value instanceof Date) {
    return Number.isNaN(value.valueOf()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
};

/**
 * Format a date as YYYY-MM-DD.
 * @param {*} value
 * @returns {string}
 */
const formatDate = (value) => {
  const date = parseDate(value);

  if (!date) {
    return 'N/A';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * Format a timestamp for generated metadata.
 * @param {Date} [date]
 * @returns {string}
 */
const formatTimestamp = (date = new Date()) => date.toISOString();

/**
 * Format a value as currency using the Nigerian Naira symbol.
 * @param {*=} value
 * @returns {string}
 */
const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '₦0';
  }

  return `₦${numberFormatter.format(amount)}`;
};

/**
 * Format a numeric measurement with an optional unit.
 * @param {*=} value
 * @param {string} unit
 * @returns {string}
 */
const formatMeasurement = (value, unit = '') => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'N/A';
  }

  return `${numberFormatter.format(amount)}${unit ? ` ${unit}` : ''}`;
};

/**
 * Format a ratio as percentage while avoiding divide-by-zero.
 * @param {*=} part
 * @param {*=} whole
 * @returns {string}
 */
const formatPercentage = (part, whole) => {
  const numerator = Number(part);
  const denominator = Number(whole);

  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return '0.00%';
  }

  return `${((numerator / denominator) * 100).toFixed(2)}%`;
};

/**
 * Return a safe string representation for missing values.
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
const safeString = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

/**
 * Safely obtain nested values from an object path.
 * @param {object} record
 * @param {string} path
 * @returns {*}
 */
const getNestedValue = (record, path) => {
  if (!record || typeof path !== 'string') {
    return undefined;
  }

  return path.split('.').reduce((value, key) => (value && typeof value === 'object' ? value[key] : undefined), record);
};

/**
 * Build a file name using a stable date string.
 * @param {string} prefix
 * @param {string} extension
 * @returns {string}
 */
const createFilename = (prefix, extension = 'csv') => {
  const now = new Date();
  return `${prefix}_${formatDate(now)}.${extension}`;
};

/**
 * Build a standard export payload that includes metadata.
 * @param {object} params
 * @param {string} params.filename
 * @param {string} params.mimeType
 * @param {string} params.content
 * @param {number} params.recordCount
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const buildExportPayload = ({ filename, mimeType, content, recordCount }) => ({
  filename,
  mimeType,
  generatedAt: formatTimestamp(),
  recordCount,
  fileSize: Buffer.byteLength(content || '', 'utf8'),
  content
});

/**
 * Validate that the input is an array. Empty arrays are accepted.
 * @param {*} data
 * @param {string} name
 * @returns {Array}
 */
const validateArray = (data, name) => {
  if (!Array.isArray(data)) {
    const message = `${name} must be an array of records.`;
    logger.warn(message, { value: data });
    throw new TypeError(message);
  }

  return data;
};

/**
 * Convert table rows into a CSV string.
 * @param {Array<object>} rows
 * @param {Array<string>} [fields]
 * @returns {string}
 */
const convertRowsToCsv = (rows, fields) => {
  if (!rows || rows.length === 0) {
    return '';
  }

  const parserOptions = {};

  if (Array.isArray(fields) && fields.length > 0) {
    parserOptions.fields = fields;
  }

  const parser = new Parser(parserOptions);
  return parser.parse(rows);
};

/**
 * Create a row object from an input record and a mapping definition.
 * @param {object} record
 * @param {object} mapping
 * @returns {object}
 */
const createRow = (record, mapping) => {
  return Object.entries(mapping).reduce((row, [label, selector]) => {
    const rawValue = typeof selector === 'function' ? selector(record) : getNestedValue(record, selector);
    row[label] = safeString(rawValue);
    return row;
  }, {});
};

/**
 * Create a CSV export from mapped rows.
 * @param {Array<object>} records
 * @param {object} mapping
 * @param {string} filename
 * @param {object} [options]
 * @param {Array<string>} [options.fields]
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const createCsvExport = (records, mapping, filename, options = {}) => {
  const validatedRecords = validateArray(records, 'records');
  const rows = validatedRecords.map((record) => createRow(record, mapping));
  const fieldOrder = Array.isArray(options.fields) && options.fields.length > 0 ? options.fields : Object.keys(mapping);
  const content = convertRowsToCsv(rows, fieldOrder);

  logger.info('CSV export generated', {
    filename,
    recordCount: rows.length,
    fields: fieldOrder
  });

  return buildExportPayload({ filename, mimeType: CSV_MIME_TYPE, content, recordCount: rows.length });
};

/**
 * Convert an array of plain objects to CSV and preserve metadata.
 * @param {Array<object>} data
 * @param {string} filename
 * @param {object} [options]
 * @param {Array<string>} [options.fields]
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const jsonToCSV = (data, filename, options = {}) => {
  const validatedData = validateArray(data, 'data');
  const fieldOrder = Array.isArray(options.fields) && options.fields.length > 0 ? options.fields : undefined;
  const content = convertRowsToCsv(validatedData, fieldOrder);

  logger.info('jsonToCSV conversion completed', {
    filename,
    recordCount: validatedData.length
  });

  return buildExportPayload({ filename, mimeType: CSV_MIME_TYPE, content, recordCount: validatedData.length });
};

const livestockMapping = {
  Type: 'type',
  Breed: 'breed',
  Age: (record) => formatMeasurement(record.age, 'years'),
  Weight: (record) => formatMeasurement(record.weight, 'kg'),
  'Cost Price': (record) => formatCurrency(record.costPrice),
  'Tag Number': (record) => safeString(record.tagNumber, 'N/A'),
  'Health Status': (record) => safeString(record.healthStatus, 'Good'),
  'Date Added': (record) => formatDate(record.createdAt),
  Status: (record) => safeString(record.status, 'Active')
};

const poultryMapping = {
  Type: 'type',
  Quantity: (record) => formatMeasurement(record.quantity),
  'Purchase Price': (record) => formatCurrency(record.purchasePrice),
  'Purchase Date': (record) => formatDate(record.purchaseDate || record.joinDate),
  'Vaccination Status': (record) => safeString(record.vaccinationStatus, 'Unknown'),
  'Age (Days)': (record) => safeString(record.ageInDays, 'N/A'),
  Status: (record) => safeString(record.status, 'Active')
};

const salesMapping = {
  Reference: (record) => safeString(record.itemSold || record.invoiceId || record.tagNumber || record.batchId || record.animalType, 'N/A'),
  Quantity: (record) => formatMeasurement(record.quantitySold ?? record.quantity ?? 0),
  'Unit Price': (record) => formatCurrency(record.pricePerUnit ?? record.sellingPrice),
  'Total Amount': (record) => {
    const quantity = Number(record.quantitySold ?? record.quantity ?? 0);
    const unitPrice = Number(record.pricePerUnit ?? record.sellingPrice ?? 0);
    const total = Number(record.totalAmount ?? quantity * unitPrice);
    return formatCurrency(total);
  },
  'Sale Date': (record) => formatDate(record.date || record.saleDate),
  Description: (record) => safeString(record.description || record.itemSold, 'N/A')
};

const expensesMapping = {
  Title: (record) => safeString(record.title, ''),
  Category: (record) => safeString(record.category, 'general'),
  Amount: (record) => formatCurrency(record.amount),
  Description: (record) => safeString(record.descriptions ?? record.description, 'N/A'),
  'Expense Date': (record) => formatDate(record.date),
  'Recorded By': (record) => safeString(record.recordedBy, 'N/A')
};

const feedMapping = {
  'Feed Type': 'feedType',
  'Animal Type': 'animalType',
  'Current Quantity': (record) => formatMeasurement(record.quantity, 'kg'),
  'Unit Cost': (record) => formatCurrency(record.unitCost ?? record.cost),
  'Daily Consumption': (record) => formatMeasurement(record.dailyConsumption ?? record.consumption, 'kg'),
  'Total Cost': (record) => {
    const quantity = Number(record.quantity ?? 0);
    const unitCost = Number(record.unitCost ?? record.cost ?? 0);
    return formatCurrency(quantity * unitCost);
  },
  'Last Updated': (record) => formatDate(record.lastConsumptionUpdate || record.updatedAt)
};

/**
 * Export livestock data to CSV.
 * @param {Array<object>} livestockData
 * @param {object} [options]
 * @param {Array<string>} [options.fields]
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const exportLivestock = (livestockData, options = {}) => {
  const filename = createFilename('livestock');
  return createCsvExport(livestockData, livestockMapping, filename, options);
};

/**
 * Export poultry data to CSV.
 * @param {Array<object>} poultryData
 * @param {object} [options]
 * @param {Array<string>} [options.fields]
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const exportPoultry = (poultryData, options = {}) => {
  const filename = createFilename('poultry');
  return createCsvExport(poultryData, poultryMapping, filename, options);
};

/**
 * Export sales data to CSV.
 * @param {Array<object>} salesData
 * @param {object} [options]
 * @param {Array<string>} [options.fields]
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const exportSales = (salesData, options = {}) => {
  const filename = createFilename('sales');
  return createCsvExport(salesData, salesMapping, filename, options);
};

/**
 * Export expenses data to CSV.
 * @param {Array<object>} expenseData
 * @param {object} [options]
 * @param {Array<string>} [options.fields]
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const exportExpenses = (expenseData, options = {}) => {
  const filename = createFilename('expenses');
  return createCsvExport(expenseData, expensesMapping, filename, options);
};

/**
 * Export feed data to CSV.
 * @param {Array<object>} feedData
 * @param {object} [options]
 * @param {Array<string>} [options.fields]
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const exportFeed = (feedData, options = {}) => {
  const filename = createFilename('feed');
  return createCsvExport(feedData, feedMapping, filename, options);
};

/**
 * Export financial summary data to CSV.
 * @param {object} summaryData
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const exportFinancialSummary = (summaryData = {}) => {
  const filename = createFilename('financial-summary');
  const revenue = Number(summaryData.totalRevenue ?? 0);
  const expenses = Number(summaryData.totalExpenses ?? 0);
  const profit = revenue - expenses;
  const profitMargin = formatPercentage(profit, revenue);

  const rows = [
    {
      Category: 'Total Revenue',
      Amount: formatCurrency(revenue),
      Period: safeString(summaryData.period, 'Current Month')
    },
    {
      Category: 'Total Expenses',
      Amount: formatCurrency(expenses),
      Period: safeString(summaryData.period, 'Current Month')
    },
    {
      Category: 'Net Profit',
      Amount: formatCurrency(profit),
      Period: safeString(summaryData.period, 'Current Month')
    },
    {
      Category: 'Profit Margin',
      Amount: profitMargin,
      Period: safeString(summaryData.period, 'Current Month')
    }
  ];

  const content = convertRowsToCsv(rows, ['Category', 'Amount', 'Period']);
  return buildExportPayload({ filename, mimeType: CSV_MIME_TYPE, content, recordCount: rows.length });
};

/**
 * Create a textual report section.
 * @param {string} title
 * @param {Array<{label:string,value:string}>} rows
 * @returns {string}
 */
const createReportSection = (title, rows) => {
  const lines = [`=== ${title} ===`, ...rows.map((row) => `${row.label}: ${row.value}`)];
  return lines.join('\n');
};

/**
 * Convert objects and arrays into readable text.
 * @param {*} value
 * @returns {string}
 */
const formatReportValue = (value) => {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

/**
 * Generate a farm report as a plain text export.
 * @param {object} reportData
 * @returns {{filename:string,mimeType:string,generatedAt:string,recordCount:number,fileSize:number,content:string}}
 */
const generateFarmReport = (reportData = {}) => {
  const filename = createFilename('farm-report', 'txt');
  const livestockTotal = Number(reportData.livestock?.total ?? 0);
  const poultryTotal = Number(reportData.poultry?.total ?? 0);
  const layers = Number(reportData.poultry?.layers ?? 0);
  const broilers = Number(reportData.poultry?.broilers ?? 0);
  const revenue = Number(reportData.financials?.revenue ?? 0);
  const expenses = Number(reportData.financials?.expenses ?? 0);
  const netProfit = revenue - expenses;

  const sections = [
    createReportSection('LIVESTOCK SUMMARY', [
      { label: 'Total Animals', value: formatMeasurement(livestockTotal) },
      { label: 'By Type', value: formatReportValue(reportData.livestock?.byType || {}) }
    ]),
    createReportSection('POULTRY SUMMARY', [
      { label: 'Total Birds', value: formatMeasurement(poultryTotal) },
      { label: 'Broilers', value: formatMeasurement(broilers) },
      { label: 'Layers', value: formatMeasurement(layers) }
    ]),
    createReportSection('FINANCIAL SUMMARY', [
      { label: 'Total Revenue (Month)', value: formatCurrency(revenue) },
      { label: 'Total Expenses (Month)', value: formatCurrency(expenses) },
      { label: 'Net Profit', value: formatCurrency(netProfit) },
      { label: 'Profit Margin', value: formatPercentage(netProfit, revenue) }
    ]),
    createReportSection('FEED STATUS', [
      { label: 'Total Feed Inventory', value: formatMeasurement(reportData.feed?.totalQuantity ?? 0, 'kg') },
      { label: 'Low Stock Items', value: formatMeasurement(reportData.feed?.lowStockItems ?? 0) }
    ]),
    createReportSection('STAFF', [
      { label: 'Total Staff', value: formatMeasurement(reportData.staff?.total ?? 0) },
      { label: 'Active', value: formatMeasurement(reportData.staff?.active ?? 0) }
    ])
  ];

  const content = [
    'CLOUDFARM COMPREHENSIVE REPORT',
    `Generated: ${formatTimestamp()}`,
    `Farm ID: ${safeString(reportData.farmId, 'Unknown')}`,
    `Manager: ${safeString(reportData.managerName, 'Unknown')}`,
    '',
    ...sections,
    '',
    'Generated by CloudFarm - Your Digital Farm Management System'
  ].join('\n');

  logger.info('Farm report generated', {
    filename,
    farmId: reportData.farmId,
    recordCount: 1
  });

  return buildExportPayload({ filename, mimeType: TEXT_MIME_TYPE, content, recordCount: 1 });
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
