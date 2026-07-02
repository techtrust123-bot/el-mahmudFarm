const { renderLayout } = require('./layout');

const unusualExpenseEmail = ({ userName = 'User', category = 'General', amount = 0, avgAmount = 0 } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <p>An unusual expense was recorded in your farm.</p>
    <ul>
      <li><strong>Category:</strong> ${category}</li>
      <li><strong>Amount:</strong> ₦${Number(amount).toLocaleString()}</li>
      <li><strong>Your Average:</strong> ₦${Number(avgAmount).toLocaleString()}</li>
    </ul>
    <p>Please verify this transaction in your dashboard.</p>
  `;

  return {
    subject: '⚠️ Unusual Expense Alert - CloudFarm',
    html: renderLayout({
      title: 'Unusual Expense Alert',
      previewText: 'A transaction looks different from your usual pattern',
      content
    })
  };
};

module.exports = {
  unusualExpenseEmail
};
