// pages/api/chat.js
import { chatWithGemini } from '../../lib/gemini';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, kundaliContext, userInfo } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    const reply = await chatWithGemini(messages, kundaliContext, userInfo);
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get AI response' });
  }
}
