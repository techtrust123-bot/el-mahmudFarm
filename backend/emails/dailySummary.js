const { renderLayout } = require('./layout');

const dailySummaryEmail = ({ userName = 'User', stats = {} } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <h3>Today's Summary</h3>
    <ul>
      <li><strong>Revenue:</strong> ₦${Number(stats.revenue || 0).toLocaleString()}</li>
      <li><strong>Expenses:</strong> ₦${Number(stats.expenses || 0).toLocaleString()}</li>
      <li><strong>Animals Sold:</strong> ${stats.animalsSold || 0}</li>
      <li><strong>Feed Consumed:</strong> ${stats.feedConsumed || 0} kg</li>
    </ul>
  `;

  return {
    subject: '📊 Daily Farm Summary - CloudFarm',
    html: renderLayout({
      title: 'Daily Farm Summary',
      previewText: 'Here is a quick overview of today’s farm activity',
      content
    })
  };
};

module.exports = {
  dailySummaryEmail
};
