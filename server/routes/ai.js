import express from 'express';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

router.post('/', async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  const apiKey = process.env.ROUTERAI_API_KEY;
  const baseUrl = process.env.ROUTERAI_BASE_URL || 'https://routerai.ru/api/v1';
  const model = process.env.ROUTERAI_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    return res.status(500).json({ error: 'ROUTERAI_API_KEY not set on server' });
  }

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: `upstream ${upstream.status}: ${err.slice(0, 300)}` });
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content || '';

    res.json({
      role: 'assistant',
      content: reply,
      usage: data?.usage || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'routerai call failed' });
  }
});

export default router;