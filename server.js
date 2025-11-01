const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();

// CORS FIXED - ALLOW ALL
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// WORKFLOWS
const WORKFLOWS = {
  purchase_order: [
    'Go to Buying module',
    'Click Purchase Order',
    'Click New',
    'Select Supplier',
    'Add Items',
    'Save'
  ],
  sales_order: [
    'Go to Selling module',
    'Click Sales Order',
    'Click New',
    'Select Customer',
    'Add Items',
    'Save'
  ],
  invoice: [
    'Click Invoice',
    'Click New',
    'Select Customer',
    'Add Items',
    'Save'
  ],
  stock_entry: [
    'Click Stock Entry',
    'Click New',
    'Select From/To Warehouse',
    'Add Items',
    'Save'
  ]
};

// GUIDE STEP ENDPOINT
app.post('/guide-step', async (req, res) => {
  try {
    const { task, step, pageUrl, availableElements } = req.body;
    const workflow = WORKFLOWS[task] || WORKFLOWS.purchase_order;
    const currentStep = workflow[step] || workflow[workflow.length - 1];

    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Task: ${task}
Step ${step + 1}/${workflow.length}: ${currentStep}
Available buttons: ${availableElements.map(e => e.text).slice(0, 15).join(', ')}

What button should they click EXACTLY? Give the exact text.

Format:
BUTTON: [exact button text]
WHY: [one sentence why]`
      }],
      max_tokens: 60,
      temperature: 0.1
    });

    const text = message.choices[0].message.content;
    const lines = text.split('\n');
    const button = lines[0]?.split(':')[1]?.trim() || currentStep;
    const why = lines[1]?.split(':')[1]?.trim() || '';

    res.json({
      instruction: `${currentStep} - ${why}`,
      nextClick: button,
      step: step + 1,
      total: workflow.length
    });
  } catch (error) {
    res.json({
      instruction: 'Click the next button',
      nextClick: 'Next',
      error: error.message
    });
  }
});

// ONBOARDING SUGGESTIONS
app.post('/onboarding-suggestions', (req, res) => {
  res.json({
    greeting: 'Pick a task:',
    suggestions: [
      'Create Purchase Order',
      'Create Sales Order',
      'Create Invoice',
      'Stock Entry'
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Frappe Guide Backend on ${PORT}`);
});
