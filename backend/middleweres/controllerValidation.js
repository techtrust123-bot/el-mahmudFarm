/**
 * Extended Validation Rules for Controllers
 * Add these to validation.js for use in controller routes
 */

const { body, check } = require('express-validator');

// Livestock validation
const livestockValidation = [
  body('type')
    .notEmpty().withMessage('Animal type is required')
    .isIn(['cattle', 'cow', 'sheep', 'goat', 'horse', 'ram', 'bull'])
    .withMessage('Invalid animal type'),
  
  body('breed')
    .notEmpty().withMessage('Breed is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Breed must be between 2 and 100 characters'),
  
  body('age')
    .notEmpty().withMessage('Age is required')
    .isInt({ min: 0 })
    .withMessage('Age must be a valid positive number'),
  
  body('weight')
    .notEmpty().withMessage('Weight is required')
    .isFloat({ min: 0 })
    .withMessage('Weight must be a valid positive number'),
  
  // body('costPrice')
  //   .notEmpty().withMessage('Cost price is required')
  //   .isFloat({ min: 0 })
  //   .withMessage('Cost price must be a valid positive number'),
  
  body('tagNumber')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tag number must be between 2 and 50 characters')
];

// Poultry validation
const poultryValidation = [
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('type')
    .notEmpty().withMessage('Poultry type is required')
    .isIn(['broiler', 'layer'])
    .withMessage('Type must be either broiler or layer'),
  
  body('purchasePrice')
    .notEmpty().withMessage('Purchase price is required')
    .isFloat({ min: 0 })
    .withMessage('Purchase price must be a valid positive number'),
  
  // body('joinDate')
  //   .notEmpty().withMessage('Join date is required')
  //   .isISO8601()
  //   .withMessage('Join date must be a valid date')
];

// Feed validation
const feedValidation = [
  body('feedType')
    .notEmpty().withMessage('Feed type is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Feed type must be between 2 and 100 characters'),
  
  body('animalType')
    .notEmpty().withMessage('Animal type is required')
    .isIn(['broiler', 'layer', 'cattle', 'cow', 'sheep', 'goat', 'horse', 'ram', 'bull'])
    .withMessage('Invalid animal type'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage('Quantity must be a valid positive number'),
  
  body('cost')
    .notEmpty().withMessage('Cost is required')
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage('Cost must be a valid positive number'),

  body('supplier')
    .notEmpty().withMessage('Supplier is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier must be between 2 and 100 characters'),

  body('purchaseDate')
    .notEmpty().withMessage('Purchase date is required')
    .isISO8601()
    .withMessage('Purchase date must be a valid date'),

  body('feedName')
    .notEmpty().withMessage('Feed name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Feed name must be between 2 and 100 characters'),

  body('feedCategory')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 50 })
    .withMessage('Feed category must be between 2 and 50 characters'),

  body('feedPricePerkg')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage('Feed price per kg must be a valid positive number'),

  body('totalPoultryFeedConsumedPerday')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage('Total poultry feed consumed per day must be a valid positive number'),

  body('totalLivestockFeedConsumedPerday')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 999999999.99 })
    .withMessage('Total livestock feed consumed per day must be a valid positive number')
];

// Sales validation - support both order batches and single sale updates
const salesValidation = [
  body('orders')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one order item is required')
    .custom((orders) => {
      if (!orders) return true;
      const validTypes = ['Poultry', 'Livestock', 'Egg'];
      orders.forEach((order, index) => {
        const item = index + 1;
        if (!order.animalType) throw new Error(`Order ${item}: animalType is required`);
        if (!validTypes.includes(order.animalType)) throw new Error(`Order ${item}: animalType must be Poultry or Livestock`);
        if (order.animalType === 'Poultry' && !order.batchId) throw new Error(`Order ${item}: batchId is required for poultry`);
        if (order.animalType === 'Egg' && !order.batchId) throw new Error(`Order ${item}: batchId is required for eggs`);
        if (order.animalType === 'Livestock' && !order.tagNumber && !order.type) throw new Error(`Order ${item}: tagNumber or type is required for livestock`);
        if (order.pricePerUnit !== undefined && order.pricePerUnit !== '' && (isNaN(Number(order.pricePerUnit)) || Number(order.pricePerUnit) < 0)) throw new Error(`Order ${item}: pricePerUnit must be a valid positive number`);
        if (order.quantitySold !== undefined && order.quantitySold !== '' && (isNaN(Number(order.quantitySold)) || Number(order.quantitySold) <= 0)) {
          throw new Error(`Order ${item}: quantitySold must be a valid positive number`);
        }
        if (!order.date) throw new Error(`Order ${item}: sale date is required`);
        if (!order.customerName) throw new Error(`Order ${item}: customer name is required`);
        if (!order.buyerContact) throw new Error(`Order ${item}: buyer contact is required`);
        if (!order.status || !['completed', 'pending'].includes(order.status)) throw new Error(`Order ${item}: status must be completed or pending`);
      });
      return true;
    }),

  body('date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Sale date must be a valid ISO date'),

  body('customerName')
    .optional({ checkFalsy: true })
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),

  body('buyerContact')
    .optional({ checkFalsy: true })
    .isLength({ min: 7, max: 11 })
    .withMessage('Buyer contact must be a valid phone number'),

  body('status')
    .optional({ checkFalsy: true })
    .isIn(['completed', 'pending'])
    .withMessage('Sale status must be completed or pending'),

  body('animalType')
    .optional()
    .isIn(['Poultry', 'Livestock', 'Egg'])
    .withMessage('Animal type must be Poultry, Livestock, or Egg'),

  body('quantitySold')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantity sold must be a valid positive number'),

  body('pricePerUnit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price per unit must be a valid positive number')
];

// Expense validation
const expenseValidation = [
  body('category')
    .notEmpty().withMessage('Category is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a valid positive number'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('date')
    .notEmpty().withMessage('Expense date is required')
    .isISO8601()
    .withMessage('Expense date must be a valid date')
];

// Staff validation
const staffValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Role must be between 2 and 50 characters'),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('contact')
    .optional()
    .isLength({ min: 7, max: 20 })
    .withMessage('Contact must be between 7 and 20 characters')
];

module.exports = {
  livestockValidation,
  poultryValidation,
  feedValidation,
  salesValidation,
  expenseValidation,
  staffValidation
};
