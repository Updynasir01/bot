const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const GEMINI_FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash-001'];
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const generateResponse = async ({ business, userMessage, conversationHistory = [] }) => {
  try {
    const isBusinessHours = checkBusinessHours(business.business_hours);

    if (!isBusinessHours && business.after_hours_message) {
      return business.after_hours_message;
    }

    // Build system prompt from business context
    const systemPrompt = buildSystemPrompt(business);

    // Build conversation messages
    const messages = [];

    // Add history
    for (const msg of conversationHistory) {
      if (msg.direction === 'inbound') {
        messages.push({ role: 'user', content: msg.message_body });
      } else if (msg.bot_response) {
        messages.push({ role: 'assistant', content: msg.bot_response });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    if (!genAI) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    const latestUserMessage = messages[messages.length - 1]?.content || userMessage;
    const modelsToTry = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== GEMINI_MODEL)];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history,
          generationConfig: {
            maxOutputTokens: 400,
            temperature: 0.5
          }
        });

        const result = await chat.sendMessage(`${systemPrompt}\n\nCustomer message: ${latestUserMessage}`);
        const text = result.response.text();
        if (text) return text;
      } catch (modelErr) {
        console.error(`Gemini model failed (${modelName}):`, modelErr.message);
      }
    }

    throw new Error('All configured Gemini models failed');
  } catch (err) {
    console.error('AI generation error:', err);
    return getFallbackResponse(business);
  }
};

const buildSystemPrompt = (business) => {
  const langInstruction = business.language_preference === 'somali'
    ? 'Always respond in Somali language.'
    : business.language_preference === 'english'
    ? 'Always respond in English.'
    : 'Respond in the same language the customer uses. Support both Somali and English.';

  return `You are a helpful WhatsApp customer service bot for ${business.name}, a ${business.business_type} business${business.city ? ` located in ${business.city}, Somalia` : ''}.

${business.description ? `About the business: ${business.description}` : ''}

${business.knowledge_base ? `
BUSINESS KNOWLEDGE BASE (use this to answer customer questions):
${business.knowledge_base.substring(0, 8000)}
` : ''}

INSTRUCTIONS:
- ${langInstruction}
- Be friendly, helpful, and concise (max 3 sentences per response)
- If asked about prices or products, use the knowledge base information
- If you don't know something, say you'll pass the question to a human staff member
- Business hours: ${business.business_hours || 'Saturday-Thursday 8am-9pm'}
- Never make up prices or information not in the knowledge base
- Use 1-2 relevant emojis per message to be friendly
- For ordering or complex requests, ask the customer to call or visit

GREETINGS:
- Somali: "${business.greeting_somali}"
- English: "${business.greeting_english}"

Keep responses short and WhatsApp-friendly. Do not use markdown formatting.`;
};

const DAY_TO_INDEX = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6
};

const parseDay = (value) => {
  if (!value) return null;
  return DAY_TO_INDEX[value.trim().toLowerCase()] ?? null;
};

const isDayInRange = (currentDay, startDay, endDay) => {
  if (startDay === null || endDay === null) return true;
  if (startDay <= endDay) return currentDay >= startDay && currentDay <= endDay;
  return currentDay >= startDay || currentDay <= endDay;
};

const parseTimeToMinutes = (value) => {
  if (!value) return null;
  const clean = value.trim().toLowerCase().replace(/\s+/g, '');
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || '0', 10);
  const period = match[3];

  if (minutes < 0 || minutes > 59 || hours < 0 || hours > 23) return null;

  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'am') hours = hours === 12 ? 0 : hours;
    if (period === 'pm') hours = hours === 12 ? 12 : hours + 12;
  }

  return (hours * 60) + minutes;
};

const checkBusinessHours = (hoursString) => {
  if (!hoursString) return true; // Default: always open

  // Expected examples:
  // - "Sat-Thu 8pm-9am"
  // - "Monday-Friday 8:00am-6:00pm"
  const match = String(hoursString).trim().match(/^([A-Za-z]+)\s*-\s*([A-Za-z]+)\s+(.+?)\s*-\s*(.+)$/);
  if (!match) return true; // keep bot available if format is unknown

  const [, startDayRaw, endDayRaw, openRaw, closeRaw] = match;
  const startDay = parseDay(startDayRaw);
  const endDay = parseDay(endDayRaw);
  const openMinutes = parseTimeToMinutes(openRaw);
  const closeMinutes = parseTimeToMinutes(closeRaw);

  if (openMinutes === null || closeMinutes === null) return true;

  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();

  if (!isDayInRange(currentDay, startDay, endDay)) return false;

  // Same opening and closing time means open all day
  if (openMinutes === closeMinutes) return true;

  // Overnight hours, e.g. 8pm-9am
  if (openMinutes > closeMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  // Normal same-day hours, e.g. 8am-9pm
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

const getFallbackResponse = (business) => {
  const messages = {
    somali: `Waxaan ka xumahay, waxaa jira dhibaato yar. Fadlan xiriir ${business.name} si toos ah. 🙏`,
    english: `Sorry, I'm having a small issue right now. Please contact ${business.name} directly. 🙏`,
    both: `Waxaan ka xumahay / Sorry for the inconvenience. Please contact us directly. 🙏`
  };
  return messages[business.language_preference] || messages.both;
};

// Test bot with a sample message
const testBot = async (business, testMessage = 'Hello, what do you sell?') => {
  return generateResponse({ business, userMessage: testMessage, conversationHistory: [] });
};

module.exports = { generateResponse, testBot };
