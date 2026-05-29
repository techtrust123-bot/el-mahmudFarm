/**
 * Extended Validation Rules for Controllers
 * Add these to validation.js for use in controller routes
 */

const { body } = require('express-validator');

// Livestock validation
const livestockValidation = [
  body('type')
    .notEmpty().withMessage('Animal type is required')
    .isIn(['cattle', 'cow', 'sheep', 'goat', 'house', 'ram'])
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
  
  body('costPrice')
    .notEmpty().withMessage('Cost price is required')
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a valid positive number'),
  
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
  
  body('joinDate')
    .notEmpty().withMessage('Join date is required')
    .isISO8601()
    .withMessage('Join date must be a valid date')
];

// Feed validation
const feedValidation = [
  body('feedType')
    .notEmpty().withMessage('Feed type is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Feed type must be between 2 and 100 characters'),
  
  body('animalType')
    .notEmpty().withMessage('Animal type is required')
    .isIn(['cattle', 'poultry', 'sheep', 'goat'])
    .withMessage('Invalid animal type'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a valid positive number'),
  
  body('unitCost')
    .notEmpty().withMessage('Unit cost is required')
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a valid positive number'),
  
  body('dailyConsumption')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Daily consumption must be a valid positive number')
];

// Sales validation
const salesValidation = [
  body('itemSold')
    .notEmpty().withMessage('Item sold is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Item must be between 2 and 100 characters'),
  
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 0 })
    .withMessage('Quantity must be a valid positive number'),
  
  body('sellingPrice')
    .notEmpty().withMessage('Selling price is required')
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a valid positive number'),
  
  body('saleDate')
    .notEmpty().withMessage('Sale date is required')
    .isISO8601()
    .withMessage('Sale date must be a valid date')
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
  
  body('expenseDate')
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
