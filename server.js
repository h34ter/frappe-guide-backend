const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FRAPPE_URL = process.env.FRAPPE_URL || 'https://erpnext-osi-ysg.f.erpnext.com';

// FRAPPE WORKFLOWS DATABASE
const FRAPPE_WORKFLOWS = {
  'Procurement Manager': {
    'purchase_order': [
      { action: 'navigate', target: 'Buying', why: 'Access procurement module' },
      { action: 'click', target: 'Purchase Order', why: 'Open Purchase Order list' },
      { action: 'click', target: 'New', why: 'Create new PO' },
      { action: 'fill', target: 'Supplier', why: 'Select your supplier' },
      { action: 'fill', target: 'Items', why: 'Add line items' },
      { action: 'click', target: 'Save', why: 'Save the purchase order' }
    ]
  },
  'Warehouse Operator': {
    'stock_entry': [
      { action: 'click', target: 'Inventory', why: 'Go to inventory module' },
      { action: 'click', target: 'Stock Entry', why: 'Create stock movement' },
      { action: 'click', target: 'New', why: 'New stock entry' },
      { action: 'fill', target: 'From Warehouse', why: 'Source location' },
      { action: 'fill', target: 'To Warehouse', why: 'Destination location' },
      { action: 'fill', target: 'Items', why: 'Items being moved' },
      { action: 'click', target: 'Save', why: 'Confirm stock movement' }
    ]
  },
  'Accountant': {
    'journal_entry': [
      { action: 'click', target: 'Accounting', why: 'Financial transactions' },
      { action: 'click', target: 'Journal Entry', why: 'Record journal entry' },
      { action: 'click', target: 'New', why: 'Create entry' },
      { action: 'fill', target: 'Account', why: 'Select account' },
      { action: 'fill', target: 'Debit/Credit', why: 'Amount entry' },
      { action: 'click', target: 'Save', why: 'Post transaction' }
    ]
  }
};

const ROLE_CONFIG = {
  'Procurement Manager': {
    emoji: '📦',
    language: 'procurement',
    focus: 'suppliers, purchase orders, costs, lead times',
    workflows: ['purchase_order', 'supplier', 'quotation']
  },
  'Warehouse Operator': {
    emoji: '🏭',
    language: 'inventory',
    focus: 'stock levels, warehouse transfers, receiving',
    workflows: ['stock_entry', 'goods_receipt', 'stock_transfer']
  },
  'Accountant': {
    emoji: '💰',
    language: 'financial',
    focus: 'accounts, reconciliation, reports, GL',
    workflows: ['journal_entry', 'invoice', 'payment']
  },
  'Retail Owner': {
    emoji: '🛍️',
    language: 'sales',
    focus: 'sales orders, customers, revenue, POS',
    workflows: ['sales_order', 'invoice', 'pos']
  }
};

// SCAN FRAPPE MODULES
async function getAvailableModules() {
  try {
    const response = await axios.get(`${FRAPPE_URL}/api/resource/Module`, {
      headers: { 'Accept': 'application/json' }
    });
    return response.data.data || [];
  } catch (error) {
    return [];
  }
}

// AUTO-GUIDE ENDPOINT
app.post('/auto-guide', async (req, res) => {
  try {
    const { userRole, pageUrl, availableElements, pageChanged } = req.body;
    const roleConfig = ROLE_CONFIG[userRole] || ROLE_CONFIG['Procurement Manager'];
    const pageContext = pageUrl.split('/').pop();

    // STEP 1: TEXT MATCHING (FAST)
    const suggestions = availableElements
      .filter(el => el.text.length > 0)
      .map(el => ({
        text: el.text,
        score: calculateRelevance(el.text, roleConfig.focus)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    let nextElementByMatching = suggestions[0]?.text || '';

    // STEP 2: AI CONTEXT ANALYSIS (FOR LOGIC)
    const aiPrompt = `Role: ${userRole} (${roleConfig.language})
Context: ${roleConfig.focus}
Page: ${pageContext}
Available buttons: ${availableElements.map(e => e.text).slice(0, 15).join(', ')}

Analyze the current context:
1. Where is the user trying to go?
2. What's the next logical step?
3. Is there an error state they need to recover from?

Respond ONLY:
NEXT_ACTION: [button name or action]
CONTEXT: [why this is the next step in their language]
IS_ERROR: [true/false - did user click wrong thing?]`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: aiPrompt }],
      max_tokens: 120,
      temperature: 0.2
    });

    const aiText = aiResponse.choices[0].message.content;
    const lines = aiText.split('\n');
    const aiNextAction = lines[0]?.split(':')[1]?.trim() || nextElementByMatching;
    const aiContext = lines[1]?.split(':')[1]?.trim() || '';
    const isError = lines[2]?.split(':')[1]?.trim().toLowerCase() === 'true';

    // HYBRID: USE AI IF DIFFERENT FROM MATCHING, OTHERWISE USE MATCHING
    const nextElement = aiNextAction || nextElementByMatching;
    const instruction = isError 
      ? `It looks like you went the wrong way. Let me guide you back. ${aiContext}`
      : aiContext || 'Continue with the next step';

    res.json({
      instruction,
      nextElement,
      roleEmoji: roleConfig.emoji,
      isError,
      confidence: suggestions[0]?.score || 0
    });
  } catch (error) {
    res.json({
      instruction: 'Continue exploring Frappe',
      nextElement: 'Next',
      roleEmoji: '✓',
      isError: false
    });
  }
});

function calculateRelevance(text, focus) {
  const keywords = focus.split(', ');
  let score = 0;
  keywords.forEach(kw => {
    if (text.toLowerCase().includes(kw.toLowerCase())) score += 10;
  });
  return score;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Frappe AI Backend on ${PORT}`));
