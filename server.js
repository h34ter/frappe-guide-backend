/* ──────────  server.js  – Frappe Guide Backend v4  ────────── */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/*────────────────  Load live Atlas  ────────────────*/
let ATLAS = [];
try {
  ATLAS = JSON.parse(fs.readFileSync("./atlas.json", "utf8"));
  console.log(`📦  Loaded ${ATLAS.length} Atlas records`);
} catch {
  console.warn("⚠️  atlas.json not found — /analyze-job will use fallback");
}

/*────────────────  /analyze-job  ────────────────*/
app.post("/analyze-job", async (req, res) => {
  try {
    const { job, industry } = req.body;

    /* find modules most related to the job from Atlas */
    const lowerJob = (job || "").toLowerCase();
    const related = ATLAS.filter(
      x =>
        x.module?.toLowerCase().includes(lowerJob) ||
        x.label?.toLowerCase().includes(lowerJob)
    );

    const modules =
      related.length > 0
        ? [...new Set(related.map(x => x.module))].slice(0, 3)
        : ["Buying", "Selling", "Accounting"];

    /* build text context for GPT */
    const context = related
      .slice(0, 30)
      .map(x => `${x.module} → ${x.label} (${x.route})`)
      .join("\n");

    const prompt = `
You are a Frappe ERP coach.

User role: "${job}" in "${industry}" industry
Relevant modules from Atlas:
${modules.join(", ")}

Example routes:
${context}

Return exactly two lines:
TUTORIAL: [step1|step2|step3|step4|step5]
SELECTORS: [sel1|sel2|sel3|sel4|sel5]
`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.2,
    });

    const txt = chat.choices[0].message.content || "";
    const steps =
      txt.match(/TUTORIAL:\s*\[(.*?)\]/i)?.[1]?.split("|").map(s => s.trim()) ||
      ["Go to Buying", "Click Purchase Order", "Click New", "Add Items", "Save"];

    const sels =
      txt.match(/SELECTORS:\s*\[(.*?)\]/i)?.[1]?.split("|").map(s => s.trim()) ||
      ["[data-label='Buying']", "[data-label='Purchase Order']", "button.primary", "[placeholder*='Item']", "button:has-text('Save')"];

    const kw = s => s.replace(/[^\w\s]/g, "").split(/\s+/).pop();
    const keywords = steps.map(kw);

    res.json({ tutorial: steps.slice(0, 5), selectors: sels.slice(0, 5), keywords });
  } catch (err) {
    console.error("❌ analyze-job error:", err);
    res.json({
      tutorial: ["Go to Buying", "Click Purchase Order", "Click New", "Add Items", "Save"],
      selectors: ["[data-label='Buying']", "[data-label='Purchase Order']", "button.primary", "[placeholder*='Item']", "button:has-text('Save')"],
      keywords: ["Buying", "Purchase", "New", "Items", "Save"],
    });
  }
});

/*────────────────  Utility endpoints  ────────────────*/
app.get("/atlas", (req, res) => res.json(ATLAS));
app.get("/", (_, r) => r.send("✅  Frappe Guide Backend running"));

/*────────────────  Start server  ────────────────*/
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Backend running on ${PORT}`));
