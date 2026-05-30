const SibApiV3Sdk = require('@sendinblue/client');

const FROM = 'padelconnectci@gmail.com';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

async function sendEmail(mailOptions) {
  try {
    console.log('[MAILER] Attempting to send to:', mailOptions.to);
    const sendSmtpEmail = {
      sender: { email: FROM, name: 'PadelConnect' },
      to: [{ email: mailOptions.to }],
      subject: mailOptions.subject,
      htmlContent: mailOptions.html,
    };
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[MAILER] SUCCESS:', result.body?.messageId);
    return result;
  } catch (err) {
    console.error('[MAILER] FAILED:', err.message);
    throw err;
  }
}

module.exports = { sendEmail, FROM };
