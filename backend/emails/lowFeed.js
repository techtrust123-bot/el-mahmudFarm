const { renderLayout } = require('./layout');

const lowFeedEmail = ({ userName = 'User', feedType = 'Feed', currentQty = 0, minThreshold = 0 } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <p>Your <strong>${feedType}</strong> feed inventory is running low.</p>
    <ul>
      <li><strong>Current Quantity:</strong> ${currentQty} kg</li>
      <li><strong>Minimum Threshold:</strong> ${minThreshold} kg</li>
    </ul>
    <p>Please reorder soon to avoid feeding delays.</p>
  `;

  return {
    subject: '🚨 Low Feed Alert - CloudFarm',
    html: renderLayout({
      title: 'Low Feed Alert',
      previewText: 'Your feed stock is below the safe threshold',
      content
    })
  };
};

module.exports = {
  lowFeedEmail
};
