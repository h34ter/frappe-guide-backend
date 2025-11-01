/* ──────────  server.js  – Frappe Guide Backend v3  ────────── */
const express = require('express');
const cors    = require('cors');
require('dotenv').config();
const OpenAI  = require('openai');

const app    = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/*‑‑‑‑‑  STATIC DATA (unchanged, truncated here)  ‑‑‑‑‑*/
const FRAPPE_FEATURES = { /* … keep full blob … */ };
const ROLE_MODULES    = { /* … keep full mapping … */ };

/*────────────────  /analyze-job  ────────────────*/
app.post('/analyze-job', async (req, res) => {
  try {
    const { job, industry } = req.body;

    const modules  = ROLE_MODULES[job] || Object.keys(FRAPPE_FEATURES).slice(0,3);
    const relevant = modules.map(m => FRAPPE_FEATURES[m]);

    /*  ── Ask GPT for BOTH steps and selectors ── */
    const prompt = `
You are a Frappe ERP UI mentor.

Return exactly two lines:
TUTORIAL: [step1|step2|step3|step4|step5]
SELECTORS: [sel1|sel2|sel3|sel4|sel5]

• Each step is plain English.
• Each selector is a robust CSS selector available in standard Frappe Desk
  (prefer attributes like [data-label="Purchase Order"] or button:has-text("Save")).
• Steps and selectors MUST line up by index.
If unsure of a selector, repeat the last known good selector.`;

    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{role:'user',content:prompt}],
      max_tokens: 250,
      temperature: 0.2
    });

    const txt   = chat.choices[0].message.content;
    const steps = txt.match(/TUTORIAL:\s*\[(.*?)\]/i)?.[1]?.split('|').map(s=>s.trim()).slice(0,5)
               || ['Go to Buying','Click Purchase Order','Click New','Add Items','Save'];

    const sels  = txt.match(/SELECTORS:\s*\[(.*?)\]/i)?.[1]?.split('|').map(s=>s.trim()).slice(0,5)
               || ['[data-label="Buying"]','[data-label="Purchase Order"]','button.primary:has-text("New")','[placeholder*="Item"]','button:has-text("Save")'];

    /* keyword fallback: last word of each step */
    const kw = s => s.replace(/[^\w\s]/g,'').split(/\s+/).pop();
    const keywords = steps.map(kw);

    res.json({ tutorial: steps, selectors: sels, keywords });
  } catch (err) {
    console.error(err);
    res.json({
      tutorial : ['Go to Buying','Click Purchase Order','Click New','Add Items','Save'],
      selectors: ['[data-label="Buying"]','[data-label="Purchase Order"]','button.primary','[placeholder*="Item"]','button:has-text("Save")'],
      keywords : ['Buying','Purchase','New','Items','Save']
    });
  }
});

/*‑‑ utility endpoints (unchanged) ‑‑*/
app.get('/features', (_,r)=>r.json(FRAPPE_FEATURES));
app.get('/roles',    (_,r)=>r.json(Object.keys(ROLE_MODULES)));

const PORT = process.env.PORT || 3001;
app.listen(PORT, ()=>console.log(`✅ Backend v3 running on ${PORT}`));
