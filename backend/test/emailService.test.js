const assert = require('assert');
const trasporter = require('../nodemailer/trasporter');
const { sendNotification } = require('../services/emailService');

(async () => {
  let sendMailCalled = false;
  const originalSendMail = trasporter.sendMail;

  trasporter.sendMail = async (mailOptions) => {
    sendMailCalled = true;
    assert.ok(mailOptions.html.includes('Grower'));
    assert.ok(mailOptions.html.includes('10 kg'));
    assert.ok(!mailOptions.html.includes('undefined'));
    return { accepted: [mailOptions.to] };
  };

  try {
    const result = await sendNotification('test@example.com', 'LOW_FEED_ALERT', {
      userName: 'Ada',
      feedType: 'Grower',
      currentQty: 10,
      minThreshold: 15
    });

    assert.strictEqual(result, true);
    assert.strictEqual(sendMailCalled, true);
    console.log('emailService regression test passed');
  } finally {
    trasporter.sendMail = originalSendMail;
  }
})();
