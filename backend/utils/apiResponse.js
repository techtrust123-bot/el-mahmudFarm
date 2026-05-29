/**
 * Standardized API Response Handler
 * All endpoints should use this for consistent response format
 */

class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Success response wrapper
 * @param {number} statusCode - HTTP status code
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {ApiResponse}
 */
const sendSuccess = (statusCode = 200, data = null, message = 'Success') => {
  return new ApiResponse(statusCode, data, message);
};

/**
 * Error response wrapper
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {*} errors - Additional error details
 * @returns {ApiResponse}
 */
const sendError = (statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = new ApiResponse(statusCode, errors, message);
  return response;
};

module.exports = {
  ApiResponse,
  sendSuccess,
  sendError
};
