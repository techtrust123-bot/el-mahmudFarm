const mongoose = require('mongoose');
const supportConversationSchema = require('../schemas/supportConversation');

module.exports = mongoose.models.SupportConversation || mongoose.model('SupportConversation', supportConversationSchema);
