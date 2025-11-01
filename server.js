// server.js - PRODUCTION GRADE WITH RAG & LEARNING
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

// Session storage (in prod, use Redis/DB)
const sessions = new Map();

// Frappe Comprehensive Knowledge Base
const FRAPPE_KNOWLEDGE = {
  modules: {
    Buying: {
      description: 'Manage supplier orders, purchase orders, and procurement',
      docTypes: ['Purchase Order', 'Purchase Invoice', 'Supplier', 'RFQ'],
      commonTasks: ['Create PO', 'Track Orders', 'Manage Suppliers', 'Process Invoices']
    },
    Selling: {
      description: 'Manage customer orders and sales',
      docTypes: ['Sales Order', 'Sales Invoice', 'Customer', 'Quotation'],
      commonTasks: ['Create SO', 'Track Sales', 'Invoice Customers', 'Manage Quotes']
    },
    Stock: {
      description: 'Manage inventory and warehouse operations',
      docTypes: ['Stock Entry', 'Item', 'Warehouse', 'Stock Balance'],
      commonTasks: ['Track Inventory', 'Create Items', 'Stock Transfers', 'Check Levels']
    },
    Accounting: {
      description: 'Financial management and reporting',
      docTypes: ['Journal Entry', 'Invoice', 'Payment', 'Expense Claim'],
      commonTasks: ['Create Entries', 'Financial Reports', 'Track Expenses', 'Reconcile']
    }
  },
  
  commonErrors: {
    'Supplier not found': 'Make sure supplier is created in "Supplier" section first',
    'Item not available': 'Check if item exists in "Item" master',
    'Insufficient balance': 'Verify warehouse stock levels',
    'Validation failed': 'Check all mandatory fields are filled'
  },

  tips: {
    'accountant': [
      'Always reconcile accounts at month end',
      'Use batch processing for multiple entries',
      'Set up GL accounts before transactions'
    ],
    'warehouse_operator': [
      'Check stock levels daily',
      'Use barcodes for faster transfers',
      'Keep physical stock up to date'
    ],
    'meat_shop_owner': [
      'Track daily sales closely',
      'Monitor expiry dates',
      'Update prices regularly'
    ]
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rag: 'enabled', learning: true });
});

// Initialize session with user profile
app.post('/init-session', async (req, res) => {
  try {
    const { role, industry, modules, experience } = req.body;
    
    const sessionId = Date.now().toString();
    sessions.set(sessionId, {
      role,
      industry,
      modules,
      experience,
      steps_completed: 0,
      mistakes_made: [],
      learned_concepts: [],
      created_at: new Date()
    });

    res.json({
      sessionId,
      message: `Welcome ${role}! I'll guide you through Frappe step by step`,
      knowledge_base: FRAPPE_KNOWLEDGE
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dynamic workflow generation with RAG
app.post('/generate-workflow', async (req, res) => {
  try {
    const { task, role, experience, sessionId } = req.body;
    const session = sessions.get(sessionId);

    const systemPrompt = `You are an expert Frappe ERP trainer for a ${role} with ${experience} years experience.
Generate a step-by-step workflow for: "${task}"

Requirements:
1. Break into 5-8 clear steps
2. Each step must have: action, selector, validation, error_handling
3. Adapt complexity to experience level (1-5, where 1 is beginner)
4. Include role-specific tips
5. Return valid JSON only

Format:
{
  "steps": [
    {
      "number": 1,
      "action": "Click on X module",
      "selector": "exact CSS selector",
      "validation": "Check if page loads",
      "tips": "Why this matters",
      "errorHandling": "What to do if it fails",
      "expectedResult": "What should happen"
    }
  ],
  "totalDuration": "5 mins",
  "difficulty": 2
}`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: [{
        role: 'system',
        content: systemPrompt
      }, {
        role: 'user',
        content: `Generate workflow for: ${task}`
      }],
      max_tokens: 1000
    });

    const workflowText = message.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = workflowText.match(/\{[\s\S]*\}/);
    const workflow = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Parse failed' };

    // Track in session
    if (session) {
      session.workflows_generated = (session.workflows_generated || 0) + 1;
    }

    res.json(workflow);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Smart context-aware guidance
app.post('/analyze-element', async (req, res) => {
  try {
    const { elementText, userRole, currentPhase, sessionId, pageContext } = req.body;
    const session = sessions.get(sessionId);

    const relevantKnowledge = FRAPPE_KNOWLEDGE.modules[pageContext] || {};
    const tips = FRAPPE_KNOWLEDGE.tips[userRole] || [];

    const systemPrompt = `You are a Frappe trainer. Context: ${JSON.stringify(relevantKnowledge)}
Tips for this role: ${tips.join(', ')}

User is on phase ${currentPhase}. Keep explanations SHORT and role-appropriate.`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: systemPrompt
      }, {
        role: 'user',
        content: `Explain "${elementText}" for a ${userRole} in 1 sentence`
      }],
      max_tokens: 80
    });

    const guidance = message.choices[0].message.content;

    // Track learning
    if (session) {
      session.learned_concepts.push(elementText);
    }

    res.json({ guidance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error detection and adaptive guidance
app.post('/handle-error', async (req, res) => {
  try {
    const { error, action, role, sessionId } = req.body;
    const session = sessions.get(sessionId);

    // Check if common error
    const commonFix = FRAPPE_KNOWLEDGE.commonErrors[error];
    if (commonFix) {
      if (session) session.mistakes_made.push(error);
      return res.json({
        solution: commonFix,
        type: 'common',
        nextStep: 'Try again with the tip above'
      });
    }

    // Use AI for uncommon errors
    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `In Frappe ERP, user (${role}) got error: "${error}" while trying to: "${action}". What should they do next? Be brief.`
      }],
      max_tokens: 100
    });

    res.json({
      solution: message.choices[0].message.content,
      type: 'adaptive'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track user progress and adapt
app.post('/track-progress', async (req, res) => {
  try {
    const { sessionId, stepsCompleted, mistakesMade, timeSpent } = req.body;
    const session = sessions.get(sessionId);

    if (session) {
      session.steps_completed = stepsCompleted;
      session.mistakes_made = mistakesMade;
      session.time_spent = timeSpent;

      // Adaptive difficulty
      const errorRate = mistakesMade.length / Math.max(stepsCompleted, 1);
      let recommendation = '';

      if (errorRate > 0.5) {
        recommendation = 'Consider slowing down and reviewing basics';
      } else if (stepsCompleted > 10 && errorRate < 0.1) {
        recommendation = 'You\'re doing great! Ready for advanced workflows?';
      }

      res.json({
        progress: {
          stepsCompleted,
          errorRate: (errorRate * 100).toFixed(1) + '%',
          recommendation
        }
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Session analytics
app.get('/session/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (session) {
    res.json(session);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Frappe Guide Backend running on ${PORT}`));


app.post('/ai-guide', async (req, res) => {
  try {
    const { goal, context, step, history } = req.body;

    const prompt = `You are helping a user accomplish: "${goal}"

Current page:
- URL: ${context.url}
- Visible buttons: ${context.visibleButtons.join(', ')}
- Visible inputs: ${context.visibleInputs.map(i => i.name).join(', ')}

Step ${step}. What should the user do NEXT? Respond ONLY in this format:
INSTRUCTION: [What to do in 1 sentence]
NEXT_ELEMENT: [exact text of button/link to click]`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.3
    });

    const response = message.choices[0].message.content;
    const lines = response.split('\n');
    
    res.json({
      instruction: lines[0]?.split(':')[1]?.trim() || 'Click the next button',
      nextElement: lines[1]?.split(':')[1]?.trim() || goal.split(' ')[0]
    });
  } catch (error) {
    res.json({ instruction: 'Continue with the next step', nextElement: 'Next' });
  }
});

app.post('/next-step', async (req, res) => {
  try {
    const { goal, visibleElements, currentUrl } = req.body;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Goal: "${goal}"
Available buttons/fields: ${visibleElements}
Current page: ${currentUrl}

What's the NEXT exact button/field text to click? Respond in format:
NEXT_CLICK: [exact text]
INSTRUCTION: [what this does in 1 line]
REASON: [why this step]`
      }],
      max_tokens: 80,
      temperature: 0.2
    });

    const text = message.choices[0].message.content;
    const lines = text.split('\n');

    res.json({
      nextClick: lines[0]?.split(':')[1]?.trim() || 'Next',
      instruction: lines[1]?.split(':')[1]?.trim() || 'Click this',
      reason: lines[2]?.split(':')[1]?.trim() || 'Proceeding'
    });
  } catch (error) {
    res.json({
      nextClick: 'New',
      instruction: 'Click New to continue',
      reason: 'Starting workflow'
    });
  }
});
