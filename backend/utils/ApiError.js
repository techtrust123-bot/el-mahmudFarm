/**
 * Custom API Error Class
 * Standardized error handling across the application
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null, isOperational = true) { 
    super(message); // Call the parent Error constructor
    this.message = message;
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational; // This tell the system Is this a normal expected error or a programming bug?
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor); // This records where the error occurred
  }
}

module.exports = ApiError;
