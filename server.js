const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// COMPLETE FRAPPE FEATURE DATABASE
const FRAPPE_FEATURES = {
  'Buying': {
    description: 'Manage suppliers, procurement, and purchase operations',
    workflows: [
      { name: 'Purchase Order', steps: ['Navigate to Buying', 'Click Purchase Order', 'Click New', 'Select Supplier', 'Add Items', 'Set Qty & Rate', 'Save', 'Submit'] },
      { name: 'Supplier Master', steps: ['Go to Buying', 'Click Supplier', 'Click New', 'Enter Name', 'Add Contact', 'Add Address', 'Set Terms', 'Save'] },
      { name: 'Request for Quote', steps: ['Go to Buying', 'Click RFQ', 'Click New', 'Add Suppliers', 'Add Items', 'Set Qty', 'Send', 'Track Responses'] }
    ],
    roles: ['Procurement Manager', 'Buyer', 'Store Manager'],
    keyFunctions: ['Create POs', 'Manage Suppliers', 'Track Deliveries', 'Manage Costs', 'Compare Quotes']
  },

  'Selling': {
    description: 'Manage customers, sales orders, quotes, and invoicing',
    workflows: [
      { name: 'Sales Order', steps: ['Go to Selling', 'Click Sales Order', 'Click New', 'Select Customer', 'Add Items', 'Set Qty & Price', 'Save', 'Submit'] },
      { name: 'Customer Master', steps: ['Go to Selling', 'Click Customer', 'Click New', 'Enter Name', 'Add Contact', 'Set Credit Limit', 'Save'] },
      { name: 'Sales Quotation', steps: ['Go to Selling', 'Click Quotation', 'Click New', 'Select Customer', 'Add Items', 'Set Price', 'Send', 'Track'] },
      { name: 'Delivery Note', steps: ['Go to Selling', 'Click Delivery Note', 'Link to SO', 'Update Qty Shipped', 'Save', 'Submit'] }
    ],
    roles: ['Sales Manager', 'Sales Executive', 'Customer Service'],
    keyFunctions: ['Create Orders', 'Manage Customers', 'Send Quotes', 'Track Deliveries', 'Manage Pricing']
  },

  'Accounting': {
    description: 'Financial transactions, reconciliation, and reporting',
    workflows: [
      { name: 'Journal Entry', steps: ['Go to Accounting', 'Click Journal Entry', 'Click New', 'Select Account', 'Enter Debit/Credit', 'Add Reference', 'Save', 'Submit'] },
      { name: 'Sales Invoice', steps: ['Go to Accounting', 'Click Sales Invoice', 'Click New', 'Select Customer', 'Add Items', 'Verify Amount', 'Save', 'Submit'] },
      { name: 'Payment Entry', steps: ['Go to Accounting', 'Click Payment', 'Click New', 'Select Invoice', 'Verify Amount', 'Select Bank', 'Save', 'Submit'] },
      { name: 'Expense Claim', steps: ['Go to Accounting', 'Click Expense Claim', 'Click New', 'Add Expenses', 'Add Receipts', 'Submit', 'Approve'] }
    ],
    roles: ['Accountant', 'Finance Manager', 'CFO'],
    keyFunctions: ['Record Transactions', 'Manage Invoices', 'Track Payments', 'Reconcile Accounts', 'Generate Reports']
  },

  'Inventory': {
    description: 'Stock management, warehouse operations, and inventory tracking',
    workflows: [
      { name: 'Stock Entry', steps: ['Go to Inventory', 'Click Stock Entry', 'Click New', 'Select Purpose', 'Choose From Warehouse', 'Choose To Warehouse', 'Add Items', 'Save', 'Submit'] },
      { name: 'Goods Receipt', steps: ['Go to Inventory', 'Click Goods Receipt', 'Click New', 'Link to PO', 'Verify Items', 'Update Qty', 'Save', 'Submit'] },
      { name: 'Stock Transfer', steps: ['Go to Inventory', 'Click Stock Entry', 'Select Transfer', 'Choose Warehouses', 'Add Items', 'Save', 'Submit'] },
      { name: 'Warehouse Setup', steps: ['Go to Inventory', 'Click Warehouse', 'Click New', 'Enter Name', 'Add Address', 'Set Parent', 'Save'] }
    ],
    roles: ['Warehouse Operator', 'Store Manager', 'Inventory Manager'],
    keyFunctions: ['Track Stock', 'Manage Warehouses', 'Record Movement', 'Track Serials', 'Set Reorder Levels']
  },

  'Manufacturing': {
    description: 'Production planning, BOM management, and quality control',
    workflows: [
      { name: 'Bill of Materials', steps: ['Go to Manufacturing', 'Click BOM', 'Click New', 'Select Item', 'Add Raw Materials', 'Set Qty', 'Save', 'Submit'] },
      { name: 'Work Order', steps: ['Go to Manufacturing', 'Click Work Order', 'Click New', 'Select Item', 'Link to BOM', 'Set Qty', 'Start Production', 'Track Progress'] },
      { name: 'Production Planning', steps: ['Go to Manufacturing', 'Click Production Plan', 'Click New', 'Select Items', 'Set Qty', 'Generate Orders', 'Review', 'Submit'] }
    ],
    roles: ['Production Manager', 'Factory Manager'],
    keyFunctions: ['Create BOM', 'Plan Production', 'Track Quality', 'Monitor Output', 'Manage Resources']
  },

  'CRM': {
    description: 'Customer relationship management and sales pipeline',
    workflows: [
      { name: 'Lead', steps: ['Go to CRM', 'Click Lead', 'Click New', 'Enter Lead Info', 'Set Source', 'Assign Owner', 'Save'] },
      { name: 'Opportunity', steps: ['Go to CRM', 'Click Opportunity', 'Click New', 'Link to Lead/Customer', 'Set Amount', 'Add Details', 'Save'] },
      { name: 'Campaign', steps: ['Go to CRM', 'Click Campaign', 'Click New', 'Set Target', 'Add Contacts', 'Launch', 'Track Results'] }
    ],
    roles: ['Sales Manager', 'Business Development'],
    keyFunctions: ['Track Leads', 'Manage Pipeline', 'Track Opportunities', 'Campaign Management', 'Forecasting']
  },

  'HR': {
    description: 'Employee management, attendance, leave, and payroll',
    workflows: [
      { name: 'Employee', steps: ['Go to HR', 'Click Employee', 'Click New', 'Enter Details', 'Set Department', 'Add Contacts', 'Save'] },
      { name: 'Attendance', steps: ['Go to HR', 'Click Attendance', 'Click New', 'Select Date', 'Select Employee', 'Mark Status', 'Save'] },
      { name: 'Leave Application', steps: ['Go to HR', 'Click Leave Application', 'Click New', 'Select Type', 'Set Dates', 'Add Reason', 'Submit', 'Approve'] },
      { name: 'Salary Structure', steps: ['Go to HR', 'Click Salary Structure', 'Click New', 'Select Employee', 'Add Earnings/Deductions', 'Calculate', 'Save'] }
    ],
    roles: ['HR Manager', 'Manager', 'Employee'],
    keyFunctions: ['Manage Employees', 'Track Attendance', 'Process Leave', 'Manage Payroll', 'Performance Reviews']
  },

  'Projects': {
    description: 'Project management and task tracking',
    workflows: [
      { name: 'Project', steps: ['Go to Projects', 'Click Project', 'Click New', 'Set Name', 'Assign Customer', 'Set Budget', 'Save'] },
      { name: 'Task', steps: ['Go to Projects', 'Click Task', 'Click New', 'Link to Project', 'Set Owner', 'Set Timeline', 'Save'] },
      { name: 'Timesheet', steps: ['Go to Projects', 'Click Timesheet', 'Click New', 'Select Employee', 'Link to Task', 'Add Hours', 'Save', 'Submit'] }
    ],
    roles: ['Project Manager', 'Team Lead'],
    keyFunctions: ['Plan Projects', 'Track Tasks', 'Manage Resources', 'Track Time', 'Budget Control']
  },

  'Quality Assurance': {
    description: 'Quality control and inspection management',
    workflows: [
      { name: 'Quality Inspection', steps: ['Go to QA', 'Click Quality Inspection', 'Click New', 'Link to Document', 'Add Parameters', 'Set Values', 'Pass/Fail', 'Submit'] },
      { name: 'Quality Procedure', steps: ['Go to QA', 'Click Quality Procedure', 'Click New', 'Set Name', 'Add Steps', 'Define Standards', 'Save'] }
    ],
    roles: ['Quality Manager', 'Inspector'],
    keyFunctions: ['Inspect Items', 'Track Quality', 'Define Standards', 'Generate Reports']
  }
};

// ROLE TO MODULE MAPPING
const ROLE_MODULES = {
  'Procurement Manager': ['Buying', 'Inventory', 'Accounting'],
  'Warehouse Operator': ['Inventory', 'Buying'],
  'Accountant': ['Accounting', 'Buying', 'Selling'],
  'Sales Manager': ['Selling', 'CRM', 'Accounting'],
  'Sales Executive': ['Selling', 'CRM'],
  'HR Manager': ['HR', 'Projects'],
  'Production Manager': ['Manufacturing', 'Inventory'],
  'Finance Manager': ['Accounting', 'Buying', 'Selling'],
  'Store Manager': ['Inventory', 'Buying'],
  'Customer Service': ['Selling', 'CRM'],
  'Factory Manager': ['Manufacturing', 'Quality Assurance'],
  'Quality Manager': ['Quality Assurance', 'Manufacturing']
};

// ENDPOINT: Analyze job and recommend features
app.post('/analyze-job', async (req, res) => {
  try {
    const { job, industry } = req.body;

    // Get relevant modules
    const modules = ROLE_MODULES[job] || Object.keys(FRAPPE_FEATURES).slice(0, 3);
    const relevantFeatures = modules.map(m => FRAPPE_FEATURES[m]);

    const docString = JSON.stringify(relevantFeatures, null, 2);

    const prompt = `You are a Frappe ERP expert coach.

User: "${job}" in "${industry}" industry
Available modules: ${modules.join(', ')}

${docString}

Create a beginner-friendly learning path:
1. What's most important for their job?
2. What workflow should they learn FIRST?
3. Why is it important?
4. Create 5-step tutorial for that first workflow

Response format:
MODULES: [module1, module2, module3]
FEATURES: [feature1, feature2]
FIRST_STEP: [first action]
WHY: [why this matters for ${job}]
TUTORIAL: [step1|step2|step3|step4|step5]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.3
    });

    const text = response.choices[0].message.content;
    const lines = text.split('\n');

    const modulesLine = lines.find(l => l.includes('MODULES:'))?.split(':')[1]?.trim() || modules.join(', ');
    const featuresLine = lines.find(l => l.includes('FEATURES:'))?.split(':')[1]?.trim() || 'Key Feature';
    const firstStepLine = lines.find(l => l.includes('FIRST_STEP:'))?.split(':')[1]?.trim() || 'Start Learning';
    const whyLine = lines.find(l => l.includes('WHY:'))?.split(':')[1]?.trim() || 'Important for your role';
    const tutorialLine = lines.find(l => l.includes('TUTORIAL:'))?.split(':')[1]?.trim() || 'Step1|Step2|Step3|Step4|Step5';

    res.json({
      modules: modulesLine.split(',').map(m => m.trim()),
      features: featuresLine.split(',').map(f => f.trim()),
      firstStep: firstStepLine,
      why: whyLine,
      tutorial: tutorialLine.split('|').map(s => s.trim()).slice(0, 5)
    });
  } catch (error) {
    res.json({
      modules: ['Buying'],
      features: ['Purchase Order'],
      firstStep: 'Navigate to Buying module',
      why: 'Essential for managing suppliers and orders',
      tutorial: ['Go to Buying', 'Click New', 'Select Supplier', 'Add Items', 'Save']
    });
  }
});

// ENDPOINT: Generate next step
app.post('/next-step', async (req, res) => {
  try {
    const { currentStep, totalSteps, tutorial, pageElements } = req.body;

    const prompt = `Find the exact Frappe button/field for this tutorial step:

Step: "${tutorial[currentStep]}"
Available on page: ${pageElements.slice(0, 15).join(', ')}

Return ONLY the exact button/field name. If not found, return closest match.
ONE WORD ONLY: `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 20,
      temperature: 0.1
    });

    const nextElement = response.choices[0].message.content.trim();

    res.json({
      step: currentStep + 1,
      instruction: tutorial[currentStep + 1] || '✅ Tutorial Complete!',
      nextElement: nextElement,
      progress: `${currentStep + 1}/${totalSteps}`
    });
  } catch (error) {
    res.json({
      step: currentStep + 1,
      instruction: 'Continue to next step',
      nextElement: 'Next',
      progress: 'N/A'
    });
  }
});

// ENDPOINT: Get all features
app.get('/features', (req, res) => {
  res.json(FRAPPE_FEATURES);
});

// ENDPOINT: Get roles
app.get('/roles', (req, res) => {
  res.json(Object.keys(ROLE_MODULES));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Frappe Guide Backend v2 on ${PORT}`));
