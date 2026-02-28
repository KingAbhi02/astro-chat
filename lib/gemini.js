// lib/gemini.js
// Gemini 2.5 Flash integration

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'; // default to a free-tier Gemini model

// The language API exposes two different endpoints depending on the model
// family. Gemini models (with "gemini" in the name) use the `:generateContent`
// method. Older bison/text models use `:generateText`. We default to a
// Gemini model so the existing conversation payload works out of the box.
function buildUrl(model) {
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;
  if (/^gemini-/i.test(model)) {
    return `${base}:generateContent`;
  }
  return `${base}:generateText`;
}

const BASE_URL = buildUrl(MODEL);

const SYSTEM_PROMPT = `You are Jyotish, an expert Vedic astrologer with deep knowledge of:
- Kundali (birth chart) analysis
- Planetary positions, degrees, and their significance
- All 12 houses and their lords
- Rashi (zodiac signs) and their characteristics  
- Nakshatras (lunar mansions) and their influence
- Dasha systems (Vimshottari dasha - mahadasha, antardasha, pratyantar dasha)
- Yogas (planetary combinations) - both auspicious and inauspicious
- Retrograde planets and their special effects
- Combustion, exaltation, debilitation of planets
- Transit effects on natal chart
- Divisional charts (Navamsa D9, etc.)
- Remedies (gemstones, mantras, rituals)

You speak like a warm, wise, experienced human astrologer — NOT like a robot.
Use a friendly, personalized tone. Address the person by name when you know it.
Mix Sanskrit terms with their English meanings (e.g., "your Lagna (ascendant) is in Vrishchika (Scorpio)").
Give specific, insightful readings based on their actual chart data provided to you.
Be positive but honest. Give actionable guidance.
When you don't have specific data, say so gracefully and offer what you can.
Keep answers conversational but rich in astrological wisdom.`;

export async function chatWithGemini(messages, kundaliContext, userInfo) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  console.log(`[gemini] using model=${MODEL} url=${BASE_URL}`);

  // Build conversation history in Gemini format
  const contents = [];

  // Add kundali context as first user message if available
  if (kundaliContext) {
    const contextMessage = `Here is the complete Vedic birth chart (Kundali) data for ${userInfo?.name || 'the user'}, born on ${userInfo?.dob || ''} at ${userInfo?.tob || ''} in ${userInfo?.pob || ''}:

${JSON.stringify(kundaliContext, null, 2)}

Please analyze this Kundali data and be ready to answer questions about it. Greet the user warmly.`;

    contents.push({ role: 'user', parts: [{ text: contextMessage }] });
    contents.push({
      role: 'model',
      parts: [{ text: `Namaste! 🙏 I have carefully studied your Kundali, ${userInfo?.name || 'dear one'}. I can see your complete birth chart with all planetary positions, house placements, dashas, and yogas. I'm ready to guide you through the cosmic blueprint of your life. What would you like to explore first — your personality and life path, career prospects, relationships, health, or perhaps your current dasha period and what it means for you?` }],
    });
  }

  // Add the actual conversation history
  for (const msg of messages) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 1500,
      topP: 0.95,
    },
  };

  let res = await fetch(`${BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    // Provide a clearer message for 404s which often mean the model name or method is unsupported
    if (res.status === 404) {
      // if we already tried the default model, just propagate the error
      if (MODEL !== 'gemini-2.5-flash') {
        console.warn(`[gemini] model ${MODEL} failed, retrying with gemini-2.5-flash`);
        // retry with default
        const fallbackUrl = buildUrl('gemini-2.5-flash');
        const retryRes = await fetch(`${fallbackUrl}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (retryRes.ok) {
          const retryData = await retryRes.json();
          const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (retryText) return retryText;
        }
      }

      throw new Error(
        `Gemini API error: ${res.status} - ${text}. The model "${MODEL}" was not found for API version v1beta or is not supported for generateContent. Set GEMINI_MODEL to a supported model or call ListModels to see available models.`
      );
    }
    throw new Error(`Gemini API error: ${res.status} - ${text}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}
