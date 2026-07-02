const { renderLayout } = require('./layout');

const subscriptionExpiringEmail = ({ userName = 'User', daysLeft = 0, expiryDate = new Date() } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <p>Your CloudFarm subscription will expire in <strong>${daysLeft} days</strong>.</p>
    <p><strong>Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
    <p>Renew now to avoid service interruption.</p>
  `;

  return {
    subject: '⏰ Your Subscription is Expiring Soon - CloudFarm',
    html: renderLayout({
      title: 'Subscription Expiring Soon',
      previewText: 'Renew your plan before it expires',
      content
    })
  };
};

module.exports = {
  subscriptionExpiringEmail
};
