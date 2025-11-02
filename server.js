/* ──────────  server.js – Frappe Guide Backend v6  ────────── */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fileUpload = require("express-fileupload");
require("dotenv").config();
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

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

    const related = ATLAS.filter(
      x =>
        x.module?.toLowerCase().includes(jobLower) ||
        x.label?.toLowerCase().includes(jobLower)
    );

    const modules = [...new Set(related.map(r => r.module))].slice(0, 5);
    const examples = related
      .slice(0, 30)
      .map(x => `${x.module} → ${x.label} (${x.route})`)
      .join("\n");

    const prompt = `
You are a live Frappe ERP instructor.
User: "${job}" in "${industry}" industry.
Relevant modules: ${modules.join(", ") || "Buying, Selling, Accounting"}
Example features:
${examples}

1. Choose the most relevant workflow.
2. Write a 5-step tutorial for this user with CSS selectors.

Format:
TUTORIAL: [step1|step2|step3|step4|step5]
SELECTORS: [sel1|sel2|sel3|sel4|sel5]
`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.25
    });

    const text = chat.choices[0].message.content || "";
    const steps =
      text.match(/TUTORIAL:\s*\[(.*?)\]/i)?.[1]?.split("|").map(s => s.trim()) ||
      ["Open Buying", "Click Purchase Order", "Click New", "Add Items", "Save"];
    const selectors =
      text.match(/SELECTORS:\s*\[(.*?)\]/i)?.[1]?.split("|").map(s => s.trim()) ||
      ["[data-label='Buying']", "[data-label='Purchase Order']", "button.primary", "[placeholder*='Item']", "button:has-text('Save')"];

    const kw = s => s.replace(/[^\w\s]/g, "").split(/\s+/).pop();
    const keywords = steps.map(kw);

    res.json({ tutorial: steps.slice(0, 5), selectors: selectors.slice(0, 5), keywords });
  } catch (err) {
    console.error("analyze-job error:", err);
    res.status(500).json({
      tutorial: ["Go to Buying", "Click Purchase Order", "Click New", "Add Items", "Save"],
      selectors: ["[data-label='Buying']", "[data-label='Purchase Order']", "button.primary", "[placeholder*='Item']", "button:has-text('Save')"],
      keywords: ["Buying", "Order", "New", "Items", "Save"]
    });
  }
});

/*──────────  /chat  (text Q&A)  ──────────*/
app.post("/chat", async (req, res) => {
  try {
    const { question = "", context = "" } = req.body;
    const atlasContext = ATLAS.slice(0, 200)
      .map(a => `${a.module}: ${a.label} (${a.route})`)
      .join("\n");

    const prompt = `
You are a live Frappe ERP teacher speaking on a Zoom-style call.
Use friendly, spoken language.

Atlas context:
${atlasContext}

User context: ${context}
User asked: "${question}"
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.4
    });

    res.json({ answer: completion.choices[0].message.content.trim() });
  } catch (e) {
    console.error("chat error:", e);
    res.json({ answer: "Sorry, I didn’t catch that." });
  }
});

/*──────────  /speak  (text → audio)  ──────────*/
app.post("/speak", async (req, res) => {
  try {
    const { text = "" } = req.body;
    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text
    });
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(await audio.arrayBuffer()));
  } catch (err) {
    console.error("tts error:", err);
    res.status(500).send("error generating speech");
  }
});

/*──────────  /transcribe  (audio → text)  ──────────*/
app.post("/transcribe", async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ text: "" });
    const audioFile = req.files.file;
    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file: audioFile.data
    });
    res.json({ text: transcription.text });
  } catch (err) {
    console.error("transcribe error:", err);
    res.status(500).json({ text: "" });
  }
});

/*──────────  Utility  ──────────*/
app.get("/atlas", (_, r) => r.json(ATLAS));
app.get("/", (_, r) => r.send("✅ Frappe Guide Backend running"));

/*──────────  Boot  ──────────*/
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅  Backend running on ${PORT}`));
