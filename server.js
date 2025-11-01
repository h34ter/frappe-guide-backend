const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// HARDCODED BULLETPROOF WORKFLOWS
const WORKFLOWS = {
  purchase_order: {
    name: '📦 Create Purchase Order',
    steps: [
      { instruction: 'Navigate to the Buying module', target: 'Buying' },
      { instruction: 'Open Purchase Orders list', target: 'Purchase Order' },
      { instruction: 'Click New to create a PO', target: 'New' },
      { instruction: 'Select a Supplier from the dropdown', target: 'Supplier' },
      { instruction: 'Click on Items table to add products', target: 'Items' },
      { instruction: 'Add item details (item, quantity, rate)', target: 'Item Code' },
      { instruction: 'Click Save to save the PO', target: 'Save' },
      { instruction: 'Click Submit to finalize', target: 'Submit' }
    ]
  },
  
  sales_order: {
    name: '🛍️ Create Sales Order',
    steps: [
      { instruction: 'Navigate to the Selling module', target: 'Selling' },
      { instruction: 'Open Sales Orders', target: 'Sales Order' },
      { instruction: 'Click New', target: 'New' },
      { instruction: 'Select a Customer', target: 'Customer' },
      { instruction: 'Add items to the order', target: 'Items' },
      { instruction: 'Enter quantity and price', target: 'Item Code' },
      { instruction: 'Save the order', target: 'Save' },
      { instruction: 'Submit for processing', target: 'Submit' }
    ]
  },

  invoice: {
    name: '📄 Create Invoice',
    steps: [
      { instruction: 'Go to Accounting module', target: 'Accounting' },
      { instruction: 'Click on Sales Invoice', target: 'Sales Invoice' },
      { instruction: 'Click New to create', target: 'New' },
      { instruction: 'Select the Customer', target: 'Customer' },
      { instruction: 'Add invoice items', target: 'Items' },
      { instruction: 'Fill item details', target: 'Item Code' },
      { instruction: 'Review the totals', target: 'Total' },
      { instruction: 'Save the invoice', target: 'Save' }
    ]
  },

  stock_entry: {
    name: '🏭 Stock Entry',
    steps: [
      { instruction: 'Go to Inventory module', target: 'Inventory' },
      { instruction: 'Open Stock Entry', target: 'Stock Entry' },
      { instruction: 'Create new entry', target: 'New' },
      { instruction: 'Select entry type (Material Receipt/Issue/Transfer)', target: 'Purpose' },
      { instruction: 'Choose source warehouse', target: 'From Warehouse' },
      { instruction: 'Choose destination warehouse', target: 'To Warehouse' },
      { instruction: 'Add items being moved', target: 'Items' },
      { instruction: 'Save and submit', target: 'Save' }
    ]
  },

  supplier: {
    name: '👥 Add Supplier',
    steps: [
      { instruction: 'Navigate to Buying module', target: 'Buying' },
      { instruction: 'Click Supplier', target: 'Supplier' },
      { instruction: 'Create new supplier', target: 'New' },
      { instruction: 'Enter supplier name', target: 'Supplier Name' },
      { instruction: 'Add contact details', target: 'Contact' },
      { instruction: 'Add address', target: 'Address' },
      { instruction: 'Enter payment terms if needed', target: 'Payment Terms' },
      { instruction: 'Save supplier', target: 'Save' }
    ]
  },

  customer: {
    name: '🤝 Add Customer',
    steps: [
      { instruction: 'Navigate to Selling module', target: 'Selling' },
      { instruction: 'Click Customer', target: 'Customer' },
      { instruction: 'Create new customer', target: 'New' },
      { instruction: 'Enter customer name', target: 'Customer Name' },
      { instruction: 'Add contact information', target: 'Contact' },
      { instruction: 'Add billing address', target: 'Address' },
      { instruction: 'Set credit limit if needed', target: 'Credit Limit' },
      { instruction: 'Save customer', target: 'Save' }
    ]
  }
};

// GET WORKFLOW
app.get('/workflow/:id', (req, res) => {
  const workflow = WORKFLOWS[req.params.id];
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  res.json(workflow);
});

// LIST ALL WORKFLOWS
app.get('/workflows', (req, res) => {
  res.json(Object.entries(WORKFLOWS).map(([id, w]) => ({ id, name: w.name })));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Frappe Guide Backend on ${PORT}`));
