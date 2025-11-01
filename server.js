// server.js - INTELLIGENT ROUTING ENGINE
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============ FRAPPE STATE & CONTEXT DATABASE ============
const FRAPPE_FLOWS = {
  'purchase order': {
    onboarding: true,
    steps: [
      { position: 'home', action: 'navigate', target: 'Buying' },
      { position: 'buying_module', action: 'click', target: 'Purchase Order' },
      { position: 'po_list', action: 'click', target: 'New' },
      { position: 'po_form', action: 'fill', target: 'Supplier', required: true },
      { position: 'po_form', action: 'fill', target: 'Items', required: true },
      { position: 'po_form', action: 'click', target: 'Save' }
    ]
  },
  'sales order': {
    onboarding: true,
    steps: [
      { position: 'home', action: 'navigate', target: 'Selling' },
      { position: 'selling_module', action: 'click', target: 'Sales Order' },
      { position: 'so_list', action: 'click', target: 'New' },
      { position: 'so_form', action: 'fill', target: 'Customer', required: true },
      { position: 'so_form', action: 'fill', target: 'Items', required: true },
      { position: 'so_form', action: 'click', target: 'Save' }
    ]
  }
};

const ROLE_GUIDES = {
  procurement_manager: {
    terminology: 'procurement',
    context: 'You manage supplier relationships and control costs',
    focus_areas: ['Supplier', 'Terms', 'Quantity', 'Cost'],
    concerns: ['Budget', 'Lead time', 'Quality']
  },
  warehouse_operator: {
    terminology: 'inventory',
    context: 'You manage physical stock and movements',
    focus_areas: ['Quantity', 'Location', 'Stock', 'Transfer'],
    concerns: ['Stock levels', 'Organization', 'Accuracy']
  },
  accountant: {
    terminology: 'financial',
    context: 'You ensure proper recording and reconciliation',
    focus_areas: ['Amount', 'GL Account', 'Tax', 'Reference'],
    concerns: ['Accuracy', 'Reconciliation', 'Compliance']
  },
  retail_owner: {
    terminology: 'sales',
    context: 'You run your store and manage daily transactions',
    focus_areas: ['Customer', 'Items', 'Price', 'Payment'],
    concerns: ['Revenue', 'Customer satisfaction', 'Speed']
  }
};

// ============ DETECT USER STATE ============
function detectPageState(pageUrl, visibleElements) {
  const url = pageUrl.toLowerCase();
  
  if (url.includes('/home')) return 'home';
  if (url.includes('/buying')) return 'buying_module';
  if (url.includes('/purchase-order') && url.includes('/view/')) return 'po_form';
  if (url.includes('/purchase-order')) return 'po_list';
  if (url.includes('/selling')) return 'selling_module';
  if (url.includes('/sales-order') && url.includes('/view/')) return 'so_form';
  if (url.includes('/sales-order')) return 'so_list';
  
  return 'unknown';
}

// ============ PERSONALIZED GUIDANCE ENGINE ============
app.post('/personalized-guidance', async (req, res) => {
  try {
    const { userProfile, goal, userJustClicked, pageUrl, availableElements, stepNumber } = req.body;

    // 1. DETECT WHERE USER IS
    const currentState = detectPageState(pageUrl, availableElements);
    
    // 2. GET WORKFLOW FOR THIS GOAL
    const workflow = FRAPPE_FLOWS[goal.toLowerCase()] || FRAPPE_FLOWS['purchase order'];
    const currentStep = workflow.steps[Math.min(stepNumber, workflow.steps.length - 1)];
    
    // 3. GET ROLE-SPECIFIC CONTEXT
    const roleGuide = ROLE_GUIDES[userProfile.role] || ROLE_GUIDES.procurement_manager;

    // 4. BUILD SMART PROMPT FOR AI
    const systemPrompt = `You are an onboarding coach for someone who has NEVER used Frappe before.
    
User: ${userProfile.name} (${userProfile.role})
Industry: ${userProfile.industry}
Goal: ${goal}
Step: ${stepNumber + 1}

Their context: ${roleGuide.context}
What matters to them: ${roleGuide.focus_areas.join(', ')}
Their concerns: ${roleGuide.concerns.join(', ')}

Current position in workflow:
- Page: ${currentState}
- Current step target: ${currentStep.target}
- Action needed: ${currentStep.action}

INSTRUCTIONS FOR YOU:
1. You're NOT explaining Frappe concepts - you're COACHING someone through a task
2. Use SIMPLE, DIRECT language - NOT formal training tone
3. Start each instruction with "Next, " so it feels like continuous guidance
4. Explain the WHY in their business context, not technical jargon
5. If they're filling a field, explain what to put there in THEIR language
6. If they're navigating, explain what each section does in THEIR context

Create a response that feels like a colleague sitting next to them saying "Here's what we do next..."`;

    const userPrompt = `The user just clicked: "${userJustClicked}"

Current page shows: ${availableElements.slice(0, 15).map(e => e.text).join(', ')}

What should they do NEXT? Be specific and conversational.

Format:
NEXT_ACTION: [exact button/field name]
YOUR_INSTRUCTION: [conversational coaching, not training]
WHY_THIS_MATTERS: [business context reason, not technical]`;

    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.4,
      max_tokens: 120
    });

    const response = message.choices[0].message.content;
    const lines = response.split('\n');

    const nextAction = lines[0]?.split(':')[1]?.trim() || 'Next';
    const instruction = lines[1]?.split(':')[1]?.trim() || 'Continue';
    const whyItMatters = lines[2]?.split(':')[1]?.trim() || 'Important step';

    // 5. ADD ONBOARDING CONTEXT IF FIRST TIME
    let onboardingHint = '';
    if (stepNumber === 0 && workflow.onboarding) {
      onboardingHint = `\n\n💡 **First time?** Don't worry - I'll guide you through each step. Just follow the glowing cursor!`;
    }

    res.json({
      nextElement: nextAction,
      personalizedInstruction: instruction + onboardingHint,
      whyThisStep: whyItMatters,
      roleEmoji: getRoleEmoji(userProfile.role),
      roleContext: `${userProfile.name} • ${userProfile.role}`,
      pageState: currentState,
      stepProgress: `${stepNumber + 1}/${workflow.steps.length}`
    });

  } catch (error) {
    console.error(error);
    res.json({
      nextElement: 'Continue',
      personalizedInstruction: 'Keep going - you\'re doing great!',
      whyThisStep: 'Important step',
      roleEmoji: '✓',
      roleContext: 'Guidance',
      pageState: 'unknown',
      stepProgress: '?'
    });
  }
});

function getRoleEmoji(role) {
  const emojis = {
    procurement_manager: '📦',
    warehouse_operator: '🏭',
    accountant: '💰',
    retail_owner: '🛍️',
    manufacturing_manager: '⚙️'
  };
  return emojis[role] || '✓';
}

// ============ ONBOARDING QUICK START ============
app.post('/onboarding-suggestions', (req, res) => {
  const { role, industry } = req.body;

  const suggestions = {
    procurement_manager: [
      'Create a Purchase Order',
      'Check Supplier List',
      'Track Purchase Status'
    ],
    warehouse_operator: [
      'Check Stock Levels',
      'Create Stock Transfer',
      'View Warehouse'
    ],
    accountant: [
      'Create Journal Entry',
      'View Financial Reports',
      'Check Account Balance'
    ],
    retail_owner: [
      'Create Sales Order',
      'View Daily Sales',
      'Check Inventory'
    ]
  };

  res.json({
    suggestions: suggestions[role] || suggestions.procurement_manager,
    greeting: `Welcome! As a ${role}, you can do these tasks in Frappe:`
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Intelligent Onboarding System on ${PORT}`);
});
