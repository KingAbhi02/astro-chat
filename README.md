# 🔮 Jyotish AI — Vedic Astrology Chatbot

A beautiful, production-grade Vedic astrology chatbot built with **Next.js** that fetches full Kundali data from the Astrology API and uses **Gemini 2.5 Flash** to answer questions like a human astrologer.

---

## Features

- 🪐 **Full Kundali Analysis** — Planets, houses, dashas, yogas, ascendant, retrograde status
- 🤖 **Gemini 2.5 Flash AI** — Responds like a warm, wise human Vedic astrologer
- 💬 **Persistent Chat Memory** — Remembers the entire conversation within a session
- ⚡ **Quick Prompts** — Pre-built questions to explore your chart instantly
- 🌟 **Beautiful Cosmic UI** — Deep space aesthetic with gold accents and Cinzel typography
- 📱 **Responsive** — Works on desktop and mobile

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Your `.env.local` is already configured. If you need to change API keys:
```env
ASTROLOGY_API_KEY=your_astrology_api_key
GEMINI_API_KEY=your_gemini_api_key
```

If you are using AstrologyAPI.com (the default provider), you should also
set `ASTROLOGY_USER_ID` to the user ID associated with your account. The
service requires Basic auth using `userId:apiKey`; if the user ID is missing
or incorrect you will receive an "invalid User ID" message and the app will
prompt you to check your credentials.

Errors fetching kundali data are surfaced to the UI with a message like:
"Unable to fetch valid kundali data. Please check your Astrology API key/user
ID and try again." This prevents sending empty or malformed data to Gemini.

### 3. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API Configuration

### Astrology API (`lib/astrologyApi.js`)

The app is pre-configured for **AstrologyAPI.com** (`json.astrologyapi.com/v1`).

**If you use a different Vedic API provider**, update `lib/astrologyApi.js`:

```js
// Change the BASE_URL and buildHeaders to match your provider:
const BASE_URL = 'https://your-api-provider.com/v1';

function buildHeaders() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
}
```

**Endpoints used:**
| Endpoint | Data |
|---|---|
| `planets` | All planetary positions, degrees, signs, houses |
| `house_cusps` | House cusp degrees and signs |
| `dashas/current_mahadasha_full` | Current dasha/antardasha |
| `dashas/mahadasha` | Complete mahadasha sequence |
| `yoga_list` | All yogas in the chart |
| `ascendant_report` | Lagna analysis |

### Gemini API (`lib/gemini.js`)

By default the app queries a Gemini model via `generateContent`. The
latest and most capable model that’s generally available on the free tier is
`gemini-2.5-flash` (a mid‑size multimodal model with up to 1 million token
context). You can override the model name with the `GEMINI_MODEL`
environment variable if you’d prefer a different Gemini variant
(e.g. `gemini-2.5-pro` for higher performance) or one of the older
`text-bison`/`code-bison` models. The code will automatically switch to
`generateText` when necessary for non‑Gemini models.

> 💡 **Tip:** If you’re not sure what models you have access to, run the
> `scripts/list_models.js` helper or call the ListModels endpoint to see the
> names. Then set `GEMINI_MODEL` accordingly.

The system prompt transforms Gemini into a Vedic astrologer named "Jyotish" with deep knowledge of:
- Kundali analysis, planetary positions, house lords
- Vimshottari Dasha system
- Yogas and their effects
- Remedies (gems, mantras, rituals)

---

## How It Works

```
User enters birth details (name, DOB, TOB, lat/lon)
        ↓
POST /api/kundali → Astrology API fetches full chart data
        ↓
Kundali data stored in React state (persists for the session)
        ↓
User sends a message
        ↓  
POST /api/chat → Gemini receives:
  - Full kundali JSON as context
  - Complete conversation history
  - User info (name, birth details)
        ↓
Gemini responds as a Vedic astrologer
        ↓
Response displayed in chat
```

---

## Project Structure

```
astro-chat/
├── pages/
│   ├── index.js          # Main UI (form + chat)
│   ├── _app.js           # App wrapper
│   └── api/
│       ├── kundali.js    # Fetches Kundali from Astrology API
│       └── chat.js       # Sends messages to Gemini
├── lib/
│   ├── astrologyApi.js   # Astrology API integration
│   └── gemini.js         # Gemini API integration + system prompt
├── styles/
│   └── globals.css       # Cosmic themed styles
├── .env.local            # API keys (do not commit!)
└── package.json
```

---

## Sample Questions to Ask

- *"What does my Lagna say about my personality?"*
- *"Tell me about my current dasha period and what to expect"*
- *"Which planets are strong or weak in my chart?"*
- *"Are there any special yogas in my kundali?"*
- *"What are my career prospects based on the 10th house?"*
- *"How is my 7th house for marriage?"*
- *"Which planets are retrograde and how does that affect me?"*
- *"What remedies would you suggest for me?"*

---

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```
Add environment variables in the Vercel dashboard.

### Self-hosted
```bash
npm run build
npm start
```

---

## Notes

- **Conversation memory** is stored in React state — it resets when you refresh the page
- **API costs** — Gemini 2.5 Flash has a free tier; check your astrology API plan for limits
- **Accuracy** — The AI gives readings based on actual chart data, but Vedic astrology interpretations are spiritual/traditional in nature
