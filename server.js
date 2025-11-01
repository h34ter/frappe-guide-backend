const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Main endpoint
app.post('/analyze-element', async (req, res) => {
  try {
    const { elementText, userRole, currentPhase } = req.body;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are a Frappe ERP training assistant for a ${userRole}.
User is at learning phase ${currentPhase}.
They're hovering over: "${elementText}"

In 1-2 sentences, explain:
1. What this does
2. Why it matters for a ${userRole}

Keep it SHORT and actionable.`
      }],
      max_tokens: 100
    });

    res.json({
      guidance: message.choices[0].message.content
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
