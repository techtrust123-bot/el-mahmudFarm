const auditLogSchema = require('../schemas/auditLog');

/**
 * Get or create an AuditLog model bound to a specific mongoose connection.
 * This supports multi-tenant farm databases by registering the schema per connection.
 *
 * @param {mongoose.Connection} connection
 * @returns {mongoose.Model}
 */
function getAuditLogModel(connection) {
  return connection.models.AuditLog || connection.model('AuditLog', auditLogSchema);
}

module.exports = { getAuditLogModel };