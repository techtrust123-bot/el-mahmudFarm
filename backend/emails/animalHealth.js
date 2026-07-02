const { renderLayout } = require('./layout');

const animalHealthEmail = ({ userName = 'User', animalType = 'Animal', animalId = 'N/A', issue = 'Needs attention' } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <p>A health issue has been flagged for one of your animals.</p>
    <ul>
      <li><strong>Animal Type:</strong> ${animalType}</li>
      <li><strong>Animal ID:</strong> ${animalId}</li>
      <li><strong>Issue:</strong> ${issue}</li>
    </ul>
    <p>Please address this promptly.</p>
  `;

  return {
    subject: '🏥 Animal Health Alert - CloudFarm',
    html: renderLayout({
      title: 'Animal Health Alert',
      previewText: 'One of your animals needs attention',
      content
    })
  };
};

module.exports = {
  animalHealthEmail
};
