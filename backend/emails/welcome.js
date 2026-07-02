const { renderLayout } = require('./layout');

const welcomeEmail = ({ userName = 'User', dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard` } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <p>Welcome to CloudFarm - your digital farm management assistant.</p>
    <p>Your account is ready. You can now:</p>
    <ul>
      <li>Track livestock and poultry</li>
      <li>Manage feed inventory</li>
      <li>Record sales and expenses</li>
      <li>Generate reports</li>
      <li>Get real-time insights</li>
    </ul>
  `;

  return {
    subject: '🌾 Welcome to CloudFarm!',
    html: renderLayout({
      title: 'Welcome to CloudFarm',
      previewText: 'Your farm management workspace is ready',
      content,
      cta: { label: 'Go to Dashboard', href: dashboardUrl }
    })
  };
};

module.exports = {
  welcomeEmail
};
