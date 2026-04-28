const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash-latest'];
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

const checkBusinessHours = (hoursString) => {
  if (!hoursString) return true; // Default: always open
  // Simple check - in production this would parse properly
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday
  // Basic: Mon-Sat 8am-9pm
  return day !== 0 && hour >= 8 && hour < 21;
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
