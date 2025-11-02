/* ──────────  server.js  – Frappe Guide Backend v5  ────────── */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/*──────────  Load live Atlas  ──────────*/
let ATLAS = [];
try {
  ATLAS = JSON.parse(fs.readFileSync("./atlas.json", "utf8"));
  console.log(`📦  Loaded ${ATLAS.length} Atlas records`);
} catch {
  console.warn("⚠️  atlas.json not found — continuing without Atlas");
}

/*──────────  /analyze-job  ──────────*/
app.post("/analyze-job", async (req, res) => {
  try {
    const { job = "", industry = "" } = req.body;
    const jobLower = job.toLowerCase();

    // find top-related modules and doctypes
    const related = ATLAS.filter(
      x =>
        x.module?.toLowerCase().includes(jobLower) ||
        x.label?.toLowerCase().includes(jobLower) ||
        x.type?.toLowerCase().includes(jobLower)
    );

    const modules = [...new Set(related.map(r => r.module))].slice(0, 5);
    const examples = related
      .slice(0, 30)
      .map(x => `${x.module} → ${x.label} (${x.route})`)
      .join("\n");

    const prompt = `
You are a Frappe ERP instructor.
User: "${job}" in "${industry}" industry.

Relevant modules: ${modules.join(", ") || "Buying, Selling, Accounting"}
Example features:
${examples}

1. What workflow should they learn first?
2. Create a 5-step tutorial with selectors and plain English steps.

Return exactly this format:
TUTORIAL: [step1|step2|step3|step4|step5]
SELECTORS: [sel1|sel2|sel3|sel4|sel5]
`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.25,
    });

    const text = chat.choices[0].message.content || "";
    const steps =
      text.match(/TUTORIAL:\s*\[(.*?)\]/i)?.[1]?.split("|").map(s => s.trim()) ||
      ["Go to Buying", "Click Purchase Order", "Click New", "Add Items", "Save"];

    const selectors =
      text.match(/SELECTORS:\s*\[(.*?)\]/i)?.[1]?.split("|").map(s => s.trim()) ||
      ["[data-label='Buying']", "[data-label='Purchase Order']", "button.primary", "[placeholder*='Item']", "button:has-text('Save')"];

    const kw = s => s.replace(/[^\w\s]/g, "").split(/\s+/).pop();
    const keywords = steps.map(kw);

    res.json({ tutorial: steps.slice(0, 5), selectors: selectors.slice(0, 5), keywords });
  } catch (err) {
    console.error("❌ analyze-job error:", err);
    res.json({
      tutorial: ["Go to Buying", "Click Purchase Order", "Click New", "Add Items", "Save"],
      selectors: ["[data-label='Buying']", "[data-label='Purchase Order']", "button.primary", "[placeholder*='Item']", "button:has-text('Save')"],
      keywords: ["Buying", "Purchase", "New", "Items", "Save"],
    });
  }
});

/*──────────  Utility endpoints  ──────────*/
app.get("/atlas", (_, r) => r.json(ATLAS));
app.get("/", (_, r) => r.send("✅  Frappe Guide Backend running"));

/*──────────  Boot  ──────────*/
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Backend running on ${PORT}`));
