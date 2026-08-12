const mongoose = require('mongoose');
const auditLogSchema = require('../schemas/auditLog');

module.exports = mongoose.model('AuditLog', auditLogSchema);
