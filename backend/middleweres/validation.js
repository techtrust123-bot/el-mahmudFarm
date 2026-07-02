const { body, validationResult } = require('express-validator');

// Reusable validation middleware with better error handling
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors for consistent response
    const formattedErrors = {};
    const errorArray = errors.array();
    
    errorArray.forEach(error => {
      const fieldName = error.param && error.param !== 'undefined' ? error.param : 'orders';
      // If we already have an error for this field, append to it
      if (formattedErrors[fieldName]) {
        formattedErrors[fieldName] += '; ' + error.msg;
      } else {
        formattedErrors[fieldName] = error.msg;
      }
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      debug: errorArray // Include raw errors for debugging
    });
  };
};

// Common validation rules
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/\d/).withMessage('Password must contain at least one number')
  .matches(/[@$!%*?&]/).withMessage('Password must contain at least one special character (@$!%*?&)');

const newPasswordValidation = body('newPassword')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
  .matches(/\d/).withMessage('Password must contain at least one number')
  .matches(/[@$!%*?&]/).withMessage('Password must contain at least one special character (@$!%*?&)');

const nameValidation = body('name')
  .isLength({ min: 2, max: 50 })
  .trim()
  .escape()
  .withMessage('Name must be between 2 and 50 characters');

const quantityValidation = body('quantity')
  .isNumeric()
  .isFloat({ min: 0 })
  .withMessage('Quantity must be a positive number');

const priceValidation = body('cost')
  .isNumeric()
  .isFloat({ min: 0 })
  .withMessage('Cost must be a positive number');

const dateValidation = body('purchaseDate')
  .isISO8601()
  .withMessage('Please provide a valid date');

const stringValidation = (field) => body(field)
  .trim()
  .escape()
  .isLength({ min: 1 })
  .withMessage(`${field} is required`);

module.exports = {
  validate,
  emailValidation,
  passwordValidation,
  newPasswordValidation,
  nameValidation,
  quantityValidation,
  priceValidation,
  dateValidation,
  stringValidation
};