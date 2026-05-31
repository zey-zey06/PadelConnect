const SibApiV3Sdk = require('@sendinblue/client');

const FROM = 'padelconnectci@gmail.com';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

async function sendEmail(mailOptions) {
  const sendSmtpEmail = {
    sender: { email: FROM, name: 'PadelConnect' },
    to: [{ email: mailOptions.to }],
    subject: mailOptions.subject,
    htmlContent: mailOptions.html,
  };
  return apiInstance.sendTransacEmail(sendSmtpEmail);
}

module.exports = { sendEmail, FROM };
