const feedSchema = require('../schemas/feed');
const poultrySchema = require('../schemas/poultry');
const livestockSchema = require('../schemas/livestock');
const sellsSchema = require('../schemas/sells');
const expensesSchema = require('../schemas/expenses');
const staffSchema = require('../schemas/staff');
const { getAuditLogModel } = require('./auditModelFactory');

/**
 * Get all farm models bound to a specific connection
 * @param {mongoose.Connection} connection - The farm database connection
 * @returns {Object} Object containing all farm models
 */
function getModels(connection) {
  // Cache models to avoid re-registration errors
  const Feed = connection.models.Feed || connection.model('Feed', feedSchema);
  const Poultry = connection.models.Poultry || connection.model('Poultry', poultrySchema);
  const LiveStock = connection.models.LiveStock || connection.model('LiveStock', livestockSchema);
  const Sells = connection.models.Sells || connection.model('Sells', sellsSchema);
  const Expenses = connection.models.Expenses || connection.model('Expenses', expensesSchema);
  const Staff = connection.models.Staff || connection.model('Staff', staffSchema);
  const Counter = connection.models.Counter || connection.model('Counter', require('../schemas/counter'));
  const AuditLog = connection.models.AuditLog || getAuditLogModel(connection);

  return {
    Feed,
    Poultry,
    LiveStock,
    Sells,
    Expenses,
    Staff,
    Counter,
    AuditLog,
  };
}

module.exports = { getModels };