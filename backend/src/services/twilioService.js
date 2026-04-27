const twilio = require('twilio');

let client = null;

const getClient = () => {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('⚠️  Twilio credentials not configured. Messages will be logged only.');
      return null;
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

const sendMessage = async ({ to, from, body }) => {
  const twilioClient = getClient();
  if (!twilioClient) {
    console.log(`[DEV] WhatsApp message to ${to}: ${body}`);
    return { sid: 'dev-mock-sid', status: 'mock' };
  }

  try {
    const message = await twilioClient.messages.create({ from, to, body });
    console.log(`Message sent: ${message.sid}`);
    return message;
  } catch (err) {
    console.error('Twilio send error:', err);
    throw err;
  }
};

const validateWebhook = (req) => {
  if (process.env.NODE_ENV === 'development') return true;
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${process.env.WEBHOOK_BASE_URL}/api/webhook/whatsapp`;
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );
};

module.exports = { sendMessage, validateWebhook };
