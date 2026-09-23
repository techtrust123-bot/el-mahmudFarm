const { renderLayout } = require('./layout');

const otpEmail = ({ userName = 'User', otp = '' } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <p>Your one-time password is ready.</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#10b981;margin:24px 0;">${otp}</p>
    <p>Use this code to complete your verification. It will expire soon.</p>
  `;

  return {
    subject: '🔐 Your CloudFarm verification code',
    html: renderLayout({
      title: 'Verify your account',
      previewText: 'Use this code to continue signing in',
      content
    })
  };
};

const passwordEmail = ({ userName = 'User', otp = '' } = {}) => {
  const content = `
    <h2>Hello ${userName},</h2>
    <p>Your one-time password is ready.</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#10b981;margin:24px 0;">${otp}</p>
    <p>Use this code to complete your reset-password. It will expire soon.</p>
  `;

  return {
    subject: '🔐 Your CloudFarm Reset Password code',
    html: renderLayout({
      title: 'Verify your account',
      previewText: 'Use this code to reset your password',
      content
    })
  };
};


module.exports = {
  otpEmail,
  passwordEmail
};
