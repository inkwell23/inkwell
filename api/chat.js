// This runs on Vercel's servers, not in the browser.
// It keeps your API key secret and forwards messages to Google's Gemini API.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing messages array' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Add it in Vercel project settings.' });
  }

  // Convert our simple {role, content} history into Gemini's format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: "You are Inkwell, a warm, clear, and honest assistant. Be concise by default, thorough when the question needs it. If you don't know something, say so plainly." }]
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', data);
      return res.status(502).json({ error: data.error?.message || 'Upstream error' });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(no response)';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error reaching the model' });
  }
}
