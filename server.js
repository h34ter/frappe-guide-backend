const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// FRAPPE KNOWLEDGE BASE (RAG database)
const FRAPPE_DOCS = {
  'Buying': {
    features: ['Purchase Order', 'Supplier', 'Request for Quote', 'Purchase Receipt', 'Purchase Invoice'],
    roles: ['Procurement Manager', 'Buyer', 'Store Manager'],
    description: 'Manage all procurement - suppliers, orders, receipts, invoices'
  },
  'Selling': {
    features: ['Sales Order', 'Customer', 'Quotation', 'Sales Invoice', 'Delivery Note'],
    roles: ['Sales Manager', 'Sales Executive', 'Customer'],
    description: 'Customer orders, quotes, invoices, deliveries'
  },
  'Accounting': {
    features: ['Journal Entry', 'Chart of Accounts', 'Invoice', 'Payment', 'Financial Reports'],
    roles: ['Accountant', 'Finance Manager', 'CFO'],
    description: 'Financial transactions, reconciliation, reports'
  },
  'Inventory': {
    features: ['Stock Entry', 'Warehouse', 'Item', 'Stock Level', 'Serial Number'],
    roles: ['Warehouse Operator', 'Store Manager', 'Inventory Manager'],
    description: 'Stock management, warehouse transfers, inventory tracking'
  },
  'CRM': {
    features: ['Lead', 'Opportunity', 'Customer', 'Contact', 'Campaign'],
    roles: ['Sales Manager', 'Business Development'],
    description: 'Customer relationship management, leads, opportunities'
  },
  'HR': {
    features: ['Employee', 'Attendance', 'Leave', 'Salary', 'Performance Appraisal'],
    roles: ['HR Manager', 'Manager'],
    description: 'Employee management, attendance, payroll, benefits'
  },
  'Manufacturing': {
    features: ['Bill of Materials', 'Work Order', 'Production', 'Quality Inspection'],
    roles: ['Production Manager', 'Factory Manager'],
    description: 'Production planning, BOM, quality control'
  }
};

// ENDPOINT: Understand job + recommend features
app.post('/analyze-job', async (req, res) => {
  try {
    const { job, industry } = req.body;

    // Build knowledge context
    const docString = JSON.stringify(FRAPPE_DOCS, null, 2);

    const prompt = `You are a Frappe ERP expert. Match this job to Frappe features.

Job: "${job}"
Industry: "${industry}"

Available Frappe Modules:
${docString}

Task: 
1. Identify 2-3 most relevant modules for this job
2. For each module, list top 3 features they should learn
3. Create a step-by-step tutorial for FIRST feature

Response format:
MODULES: [module1, module2, module3]
FEATURES: [feature1, feature2, feature3]
FIRST_STEP: [first action to teach]
WHY: [one sentence why this matters]
TUTORIAL: [step1|step2|step3|step4|step5] (pipe separated)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3
    });

    const text = response.choices[0].message.content;
    const lines = text.split('\n');

    const modules = lines[0]?.split(':')[1]?.trim() || 'Buying';
    const features = lines[1]?.split(':')[1]?.trim() || 'Purchase Order';
    const firstStep = lines[2]?.split(':')[1]?.trim() || 'Navigate to module';
    const why = lines[3]?.split(':')[1]?.trim() || 'Essential for your job';
    const tutorialText = lines[4]?.split(':')[1]?.trim() || '';
    const tutorialSteps = tutorialText.split('|').map(s => s.trim()).filter(s => s);

    res.json({
      modules: modules.split(',').map(m => m.trim()),
      features: features.split(',').map(f => f.trim()),
      firstStep,
      why,
      tutorial: tutorialSteps.slice(0, 5)
    });
  } catch (error) {
    res.json({
      modules: ['Buying'],
      features: ['Purchase Order'],
      firstStep: 'Go to Buying module',
      why: 'Start with procurement',
      tutorial: ['Navigate to Buying', 'Click New', 'Select Supplier', 'Add Items', 'Save']
    });
  }
});

// ENDPOINT: Generate next step
app.post('/next-step', async (req, res) => {
  try {
    const { currentStep, totalSteps, tutorial, pageElements } = req.body;

    const prompt = `Given a Frappe tutorial step:

Current: "${tutorial[currentStep]}"
Next in tutorial: "${tutorial[currentStep + 1] || 'Complete'}"
Available on page: ${pageElements.join(', ')}

Find the EXACT button/field name on the page that matches this step.
Response ONLY: [exact name]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
      temperature: 0.1
    });

    const nextElement = response.choices[0].message.content.trim();

    res.json({
      step: currentStep + 1,
      instruction: tutorial[currentStep + 1] || 'Tutorial complete!',
      nextElement: nextElement,
      progress: `${currentStep + 1}/${totalSteps}`
    });
  } catch (error) {
    res.json({
      step: currentStep + 1,
      instruction: 'Continue',
      nextElement: 'Next',
      progress: 'N/A'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Frappe Guide RAG Backend on ${PORT}`));
