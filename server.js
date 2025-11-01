/* ──────────── server.js – Frappe Guide Backend v2 ──────────── */
const express = require('express');
const cors    = require('cors');
require('dotenv').config();
const OpenAI  = require('openai');

const app     = express();
app.use(cors());
app.use(express.json());

const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* =====================  STATIC DATA  ===================== */
const FRAPPE_FEATURES = { /* … (unchanged big JSON blob) … */ };
const ROLE_MODULES    = { /* … (unchanged mapping) … */ };

/* =====================  /analyze-job  ==================== */
app.post('/analyze-job', async (req, res) => {
  try {
    const { job, industry } = req.body;

    const modules = ROLE_MODULES[job] || Object.keys(FRAPPE_FEATURES).slice(0, 3);
    const relevantFeatures = modules.map(m => FRAPPE_FEATURES[m]);

    /* ---------- Ask the LLM for role‑specific copy ---------- */
    const prompt = `
You are a Frappe ERP expert coach.

User: "${job}" in "${industry}" industry
Relevant modules: ${modules.join(', ')}

${JSON.stringify(relevantFeatures, null, 2)}

Create a beginner‑friendly learning path (max 5 steps).
Return in EXACT format:
TUTORIAL: [step1|step2|step3|step4|step5]`;

    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.3
    });

    const tutorialSteps =
      chat.choices[0].message.content
        .match(/TUTORIAL:\s*\[(.*?)\]/i)?.[1]
        ?.split('|').map(s => s.trim()).filter(Boolean)
        .slice(0, 5) || ['Go to Buying', 'Click Purchase Order', 'Click New', 'Add Items', 'Save'];

    /* short keyword per step – last alpha word of the sentence */
    const extract = s => s.replace(/[^\w\s]/g, '').split(' ').pop();
    const keywords = tutorialSteps.map(extract);

    res.json({ tutorial: tutorialSteps, keywords });
  } catch (err) {
    console.error(err);
    res.json({
      tutorial: ['Go to Buying', 'Click Purchase Order', 'Click New', 'Add Items', 'Save'],
      keywords: ['Buying', 'Purchase', 'New', 'Items', 'Save']
    });
  }
});

/* =====================  other endpoints (unchanged)  ==================== */
app.get('/features', (_,res) => res.json(FRAPPE_FEATURES));
app.get('/roles',    (_,res) => res.json(Object.keys(ROLE_MODULES)));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Frappe Guide Backend v2 running on ${PORT}`));
/* ────────────────────────────────────────────────────────── */
