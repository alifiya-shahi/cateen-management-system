const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const placeOrderBtn = document.getElementById('placeOrderBtn');
const customerNameInput = document.getElementById('customerName');
const orderMessageEl = document.getElementById('orderMessage');
const dashboardStatsEl = document.getElementById('dashboardStats');
const reportStatsEl = document.getElementById('reportStats');
const topItemsEl = document.getElementById('topItems');
const ordersListEl = document.getElementById('ordersList');
const refreshAllBtn = document.getElementById('refreshAllBtn');
const currentDateEl = document.getElementById('currentDate');
const customerRowEl = document.querySelector('.customer-row');

const CART_STORAGE_KEY = 'canteen_shared_cart';
const COMBO_STORAGE_KEY = 'canteen_combo_choice';
const THEME_STORAGE_KEY = 'canteen_theme_choice';
const STATUS_FLOW = ['Pending', 'Cooking', 'Ready', 'Completed'];
const THEMES = [
  { value: 'warm', label: 'Warm Cafe' },
  { value: 'mint', label: 'Mint Fresh' },
  { value: 'sunset', label: 'Sunset Pop' },
];
const COMBOS = [
  {
    value: 'none',
    label: 'No Combo',
    discountPercent: 0,
    requiredCategories: [],
  },
  {
    value: 'burger-fries-drink',
    label: 'Burger + Fries + Cold Drink (15% OFF)',
    discountPercent: 15,
    requiredCategories: ['Burger', 'Fries', 'Cold Drinks'],
  },
  {
    value: 'pizza-drink',
    label: 'Pizza + Cold Drink (10% OFF)',
    discountPercent: 10,
    requiredCategories: ['Pizza', 'Cold Drinks'],
  },
];

const cart = new Map();
let comboSelectEl = null;
let comboHintEl = null;
let billModalEl = null;

currentDateEl.textContent = new Date().toLocaleString();

function currency(value) {
  return `Rs. ${Number(value).toFixed(2)}`;
}

function showMessage(text, type = 'success') {
  orderMessageEl.textContent = text;
  orderMessageEl.className = `order-message ${type}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
}

function mountThemeSwitcher() {
  const wrapper = document.createElement('div');
  wrapper.className = 'theme-switcher';

  const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'warm';
  const options = THEMES.map((theme) => {
    const selected = theme.value === saved ? 'selected' : '';
    return `<option value="${theme.value}" ${selected}>${theme.label}</option>`;
  }).join('');

  wrapper.innerHTML = `
    <label for="themeSelect">Theme</label>
    <select id="themeSelect">${options}</select>
  `;

  document.body.appendChild(wrapper);
  applyTheme(saved);

  const select = wrapper.querySelector('#themeSelect');
  select.addEventListener('change', () => {
    localStorage.setItem(THEME_STORAGE_KEY, select.value);
    applyTheme(select.value);
  });
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function saveCart() {
  const serialized = [...cart.values()].map((item) => ({
    id: Number(item.id),
    name: item.name,
    category: item.category || '',
    price: Number(item.price),
    quantity: Number(item.quantity),
  }));

  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(serialized));
}

function loadCart() {
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    cart.clear();
    for (const item of parsed) {
      if (!item || !item.id || !item.name || !item.quantity) {
        continue;
      }

      cart.set(Number(item.id), {
        id: Number(item.id),
        name: item.name,
        category: item.category || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 0,
      });
    }
  } catch (error) {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}

function mountComboControls() {
  if (!customerRowEl) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'combo-row';

  const persistedCombo = localStorage.getItem(COMBO_STORAGE_KEY) || 'none';
  const options = COMBOS.map((combo) => {
    const selected = combo.value === persistedCombo ? 'selected' : '';
    return `<option value="${combo.value}" ${selected}>${combo.label}</option>`;
  }).join('');

  wrapper.innerHTML = `
    <label for="comboSelect">Select Combo Offer</label>
    <select id="comboSelect">${options}</select>
    <small id="comboHint" class="combo-hint"></small>
  `;

  customerRowEl.insertAdjacentElement('afterend', wrapper);

  comboSelectEl = wrapper.querySelector('#comboSelect');
  comboHintEl = wrapper.querySelector('#comboHint');

  comboSelectEl.addEventListener('change', () => {
    localStorage.setItem(COMBO_STORAGE_KEY, comboSelectEl.value);
    renderCart();
  });
}

function getSelectedCombo() {
  const value = comboSelectEl ? comboSelectEl.value : 'none';
  return COMBOS.find((combo) => combo.value === value) || COMBOS[0];
}

function getCartCategories() {
  const set = new Set();
  for (const item of cart.values()) {
    if (item.category) {
      set.add(item.category);
    }
  }
  return set;
}

function getPricing() {
  const subtotal = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  const combo = getSelectedCombo();
  const categories = getCartCategories();
  const eligible = combo.requiredCategories.every((category) => categories.has(category));
  const discount = combo.discountPercent > 0 && eligible ? (subtotal * combo.discountPercent) / 100 : 0;
  const total = Math.max(0, subtotal - discount);

  return {
    subtotal,
    discount,
    total,
    combo,
    eligible,
  };
}

function renderComboHint(pricing) {
  if (!comboHintEl) {
    return;
  }

  if (!cart.size) {
    comboHintEl.textContent = '';
    return;
  }

  if (pricing.combo.value === 'none') {
    comboHintEl.textContent = `Subtotal: ${currency(pricing.subtotal)}`;
    return;
  }

  if (pricing.eligible) {
    comboHintEl.textContent = `Combo applied: -${currency(pricing.discount)} | Final: ${currency(pricing.total)}`;
    return;
  }

  const missing = pricing.combo.requiredCategories.filter(
    (category) => !getCartCategories().has(category)
  );
  comboHintEl.textContent = `Add ${missing.join(', ')} to unlock ${pricing.combo.discountPercent}% off.`;
}

function ensureBillModal() {
  if (billModalEl) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'bill-modal';
  wrapper.innerHTML = `
    <div class="bill-dialog" role="dialog" aria-modal="true" aria-label="Bill preview">
      <div class="bill-head">
        <h3>Bill Preview</h3>
        <button type="button" class="btn-secondary" data-bill-close>Close</button>
      </div>
      <div class="bill-meta">
        <span id="billCustomer"></span>
        <span id="billDate"></span>
      </div>
      <div class="bill-table-wrap">
        <table class="bill-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody id="billItemsBody"></tbody>
        </table>
      </div>
      <div class="bill-summary">
        <p><span>Subtotal</span><strong id="billSubtotal"></strong></p>
        <p><span>Combo Discount</span><strong id="billDiscount"></strong></p>
        <p class="bill-total"><span>Total</span><strong id="billTotal"></strong></p>
      </div>
      <div class="bill-actions">
        <button type="button" class="btn-secondary" id="billPrintBtn">Print Bill</button>
        <button type="button" id="billConfirmBtn">Confirm & Place Order</button>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);
  billModalEl = wrapper;

  const closeBill = () => {
    billModalEl.classList.remove('open');
  };

  wrapper.addEventListener('click', (event) => {
    if (event.target === wrapper) {
      closeBill();
    }
  });

  wrapper.querySelector('[data-bill-close]').addEventListener('click', closeBill);
  wrapper.querySelector('#billPrintBtn').addEventListener('click', printBill);
  wrapper.querySelector('#billConfirmBtn').addEventListener('click', placeOrder);
}

function getBillRowsMarkup() {
  return [...cart.values()]
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${item.quantity}</td>
          <td>${currency(item.price)}</td>
          <td>${currency(item.price * item.quantity)}</td>
        </tr>
      `
    )
    .join('');
}

function getBillState() {
  const pricing = getPricing();
  return {
    customerName: customerNameInput.value.trim() || 'Guest',
    createdAt: new Date().toLocaleString(),
    subtotal: pricing.subtotal,
    discount: pricing.discount,
    total: pricing.total,
    discountLabel: pricing.combo.discountPercent > 0 && pricing.eligible ? pricing.combo.label : 'No combo',
    rows: getBillRowsMarkup(),
  };
}

function renderBillPreview() {
  ensureBillModal();
  const bill = getBillState();

  billModalEl.querySelector('#billCustomer').textContent = `Customer: ${bill.customerName}`;
  billModalEl.querySelector('#billDate').textContent = `Date: ${bill.createdAt}`;
  billModalEl.querySelector('#billItemsBody').innerHTML = bill.rows;
  billModalEl.querySelector('#billSubtotal').textContent = currency(bill.subtotal);
  billModalEl.querySelector('#billDiscount').textContent = `${currency(bill.discount)} (${bill.discountLabel})`;
  billModalEl.querySelector('#billTotal').textContent = currency(bill.total);
}

function openBillPreview() {
  if (!cart.size) {
    showMessage('Please add at least one item to preview the bill.', 'error');
    return;
  }

  const pricing = getPricing();
  if (pricing.combo.discountPercent > 0 && !pricing.eligible) {
    showMessage('Selected combo is not eligible yet. Complete required categories first.', 'error');
    return;
  }

  renderBillPreview();
  billModalEl.classList.add('open');
}

function printBill() {
  const bill = getBillState();
  const popup = window.open('', '_blank', 'width=900,height=700');

  if (!popup) {
    showMessage('Unable to open print view. Please allow popups and try again.', 'error');
    return;
  }

  popup.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Canteen Bill</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
          h1 { margin: 0 0 10px 0; font-size: 24px; }
          .meta { margin-bottom: 14px; color: #4b5563; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          .summary { margin-top: 14px; max-width: 360px; margin-left: auto; }
          .summary p { display: flex; justify-content: space-between; margin: 6px 0; }
          .summary .total { font-size: 18px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Canteen Bill</h1>
        <div class="meta">Customer: ${escapeHtml(bill.customerName)} | Date: ${escapeHtml(bill.createdAt)}</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bill.rows}
          </tbody>
        </table>
        <div class="summary">
          <p><span>Subtotal</span><strong>${currency(bill.subtotal)}</strong></p>
          <p><span>Combo Discount</span><strong>${currency(bill.discount)} (${escapeHtml(bill.discountLabel)})</strong></p>
          <p class="total"><span>Total</span><strong>${currency(bill.total)}</strong></p>
        </div>
      </body>
    </html>
  `);

  popup.document.close();
  popup.focus();
  popup.print();
}

function renderCart() {
  cartItemsEl.innerHTML = '';

  if (!cart.size) {
    cartItemsEl.innerHTML = '<p>No items in cart yet.</p>';
    cartTotalEl.textContent = currency(0);
    renderComboHint({ combo: { value: 'none' }, subtotal: 0, discount: 0, total: 0, eligible: false });
    return;
  }

  for (const item of cart.values()) {
    const line = document.createElement('div');
    line.className = 'cart-line';

    line.innerHTML = `
      <div>
        <strong>${item.name}</strong><br />
        <small>${currency(item.price)} x ${item.quantity}</small>
      </div>
      <div class="cart-actions">
        <button class="minus">-</button>
        <button class="plus">+</button>
        <button class="remove">Remove</button>
      </div>
    `;

    line.querySelector('.minus').addEventListener('click', () => {
      item.quantity -= 1;
      if (item.quantity <= 0) {
        cart.delete(item.id);
      } else {
        cart.set(item.id, item);
      }
      saveCart();
      renderCart();
    });

    line.querySelector('.plus').addEventListener('click', () => {
      item.quantity += 1;
      cart.set(item.id, item);
      saveCart();
      renderCart();
    });

    line.querySelector('.remove').addEventListener('click', () => {
      cart.delete(item.id);
      saveCart();
      renderCart();
    });

    cartItemsEl.appendChild(line);
  }

  const pricing = getPricing();
  cartTotalEl.textContent = currency(pricing.total);
  renderComboHint(pricing);
}

async function placeOrder() {
  if (!cart.size) {
    showMessage('Please add at least one item to place an order.', 'error');
    return;
  }

  const pricing = getPricing();
  if (pricing.combo.discountPercent > 0 && !pricing.eligible) {
    showMessage('Selected combo is not eligible yet. Complete required categories first.', 'error');
    return;
  }

  const items = [...cart.values()].map((item) => ({
    menuItemId: item.id,
    quantity: item.quantity,
  }));

  const payload = {
    customerName: customerNameInput.value.trim() || 'Guest',
    items,
  };

  if (pricing.combo.discountPercent > 0 && pricing.eligible) {
    payload.combo = {
      name: pricing.combo.label,
      discountPercent: pricing.combo.discountPercent,
    };
  }

  try {
    const order = await fetchJSON('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    cart.clear();
    saveCart();
    renderCart();
    if (billModalEl) {
      billModalEl.classList.remove('open');
    }
    customerNameInput.value = '';
    showMessage(`Order #${order.id} created successfully.`, 'success');
    await loadAdminData();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

function statCard(label, value) {
  return `
    <div class="stat-card">
      <p>${label}</p>
      <h3>${value}</h3>
    </div>
  `;
}

async function loadDashboard() {
  const stats = await fetchJSON('/api/admin/dashboard');
  dashboardStatsEl.innerHTML = [
    statCard('Today Orders', stats.todayOrders),
    statCard('Active Orders', stats.pendingOrders),
    statCard('Completed Orders', stats.completedOrders),
    statCard('Today Revenue', currency(stats.todayRevenue)),
  ].join('');
}

async function loadReports() {
  const [weekly, monthly] = await Promise.all([
    fetchJSON('/api/reports/weekly'),
    fetchJSON('/api/reports/monthly'),
  ]);

  reportStatsEl.innerHTML = [
    statCard('Weekly Orders', weekly.totalOrders),
    statCard('Weekly Revenue', currency(weekly.revenue)),
    statCard('Monthly Orders', monthly.totalOrders),
    statCard('Monthly Revenue', currency(monthly.revenue)),
  ].join('');
}

async function loadTopItems() {
  const top = await fetchJSON('/api/reports/top-items?limit=5');
  if (!top.length) {
    topItemsEl.innerHTML = '<p>No completed sales yet.</p>';
    return;
  }

  topItemsEl.innerHTML = top
    .map(
      (item) => `
        <div class="top-line">
          <div class="top-line-main">
            <strong>${item.name}</strong>
            <small>Sold: ${item.quantitySold}</small>
          </div>
          <strong>${currency(item.revenue)}</strong>
        </div>
      `
    )
    .join('');
}

function nextStatus(status) {
  const idx = STATUS_FLOW.indexOf(status);
  if (idx < 0 || idx === STATUS_FLOW.length - 1) {
    return null;
  }
  return STATUS_FLOW[idx + 1];
}

async function advanceStatus(orderId, status) {
  await fetchJSON(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

async function loadOrders() {
  const orders = await fetchJSON('/api/orders');
  if (!orders.length) {
    ordersListEl.innerHTML = '<p>No orders available.</p>';
    return;
  }

  ordersListEl.innerHTML = '';

  for (const order of orders) {
    const el = document.createElement('div');
    el.className = 'order-line';

    const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
    const comboInfo = order.comboName ? `<small>Combo: ${order.comboName}</small>` : '';

    el.innerHTML = `
      <div class="order-line-main">
        <strong>#${order.id} - ${order.customerName}</strong>
        <small>${new Date(order.createdAt).toLocaleString()} | ${currency(order.totalAmount)}</small>
        ${comboInfo}
      </div>
      <div>
        <span class="status ${statusClass}">${order.status}</span>
      </div>
    `;

    const next = nextStatus(order.status);
    if (next) {
      const btn = document.createElement('button');
      btn.textContent = `Move to ${next}`;
      btn.addEventListener('click', async () => {
        try {
          await advanceStatus(order.id, next);
          await loadAdminData();
        } catch (error) {
          showMessage(error.message, 'error');
        }
      });
      el.appendChild(btn);
    }

    ordersListEl.appendChild(el);
  }
}

async function loadAdminData() {
  await Promise.all([loadDashboard(), loadReports(), loadTopItems(), loadOrders()]);
}

async function init() {
  try {
    mountThemeSwitcher();
    mountComboControls();
    loadCart();
    renderCart();
    await loadAdminData();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

refreshAllBtn.addEventListener('click', loadAdminData);
placeOrderBtn.addEventListener('click', openBillPreview);

init();
