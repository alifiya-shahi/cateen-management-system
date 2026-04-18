const menuItems = [
  { id: 1, name: 'Veg Burger', category: 'Burger', price: 79 },
  { id: 2, name: 'Aloo Tikki Burger', category: 'Burger', price: 89 },
  { id: 3, name: 'Cheese Burger', category: 'Burger', price: 109 },
  { id: 4, name: 'Paneer Burger', category: 'Burger', price: 119 },
  { id: 5, name: 'Double Patty Burger', category: 'Burger', price: 149 },

  { id: 6, name: 'Veg Frankie', category: 'Frankie', price: 69 },
  { id: 7, name: 'Paneer Frankie', category: 'Frankie', price: 89 },
  { id: 8, name: 'Cheese Frankie', category: 'Frankie', price: 99 },
  { id: 9, name: 'Masala Frankie', category: 'Frankie', price: 79 },

  { id: 10, name: 'Salted Fries', category: 'Fries', price: 59 },
  { id: 11, name: 'Peri Peri Fries', category: 'Fries', price: 69 },
  { id: 12, name: 'Cheese Fries', category: 'Fries', price: 89 },
  { id: 13, name: 'Masala Fries', category: 'Fries', price: 79 },

  { id: 14, name: 'Red Sauce Pasta', category: 'Pasta', price: 129 },
  { id: 15, name: 'White Sauce Pasta', category: 'Pasta', price: 139 },
  { id: 16, name: 'Mix Sauce Pasta', category: 'Pasta', price: 149 },

  { id: 17, name: 'Classic Maggie', category: 'Maggie', price: 49 },
  { id: 18, name: 'Cheese Maggie', category: 'Maggie', price: 69 },
  { id: 19, name: 'Masala Maggie', category: 'Maggie', price: 59 },

  { id: 20, name: 'Margherita Pizza', category: 'Pizza', price: 179 },
  { id: 21, name: 'Farm Fresh Pizza', category: 'Pizza', price: 219 },
  { id: 22, name: 'Paneer Tikka Pizza', category: 'Pizza', price: 239 },

  { id: 23, name: 'Masala Dosa', category: 'South Indian', price: 99 },
  { id: 24, name: 'Plain Dosa', category: 'South Indian', price: 89 },
  { id: 25, name: 'Idli Sambar', category: 'South Indian', price: 79 },
  { id: 26, name: 'Medu Vada', category: 'South Indian', price: 89 },

  { id: 27, name: 'Cold Coffee', category: 'Cold Drinks', price: 69 },
  { id: 28, name: 'Lemon Soda', category: 'Cold Drinks', price: 49 },
  { id: 29, name: 'Mango Shake', category: 'Cold Drinks', price: 89 },
  { id: 30, name: 'Chocolate Shake', category: 'Cold Drinks', price: 99 },
  { id: 31, name: 'Orange Mojito', category: 'Cold Drinks', price: 79 },
];

const STATUS_FLOW = ['Pending', 'Cooking', 'Ready', 'Completed'];

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

let orderCounter = 1000;
const orders = [
  {
    id: orderCounter++,
    customerName: 'Walk-in Customer',
    items: [
      { menuItemId: 1, name: 'Veg Burger', price: 79, quantity: 2, lineTotal: 158 },
      { menuItemId: 27, name: 'Cold Coffee', price: 69, quantity: 1, lineTotal: 69 },
    ],
    subtotalAmount: 227,
    discountAmount: 0,
    comboName: null,
    totalAmount: 227,
    status: 'Completed',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: orderCounter++,
    customerName: 'Online User',
    items: [
      { menuItemId: 20, name: 'Margherita Pizza', price: 179, quantity: 1, lineTotal: 179 },
    ],
    subtotalAmount: 179,
    discountAmount: 0,
    comboName: null,
    totalAmount: 179,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  },
];

function getMenu() {
  return menuItems;
}

function getOrders() {
  return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createOrder(payload) {
  const customerName = (payload.customerName || 'Guest').trim();
  const incomingItems = Array.isArray(payload.items) ? payload.items : [];
  const combo = payload.combo || null;

  if (!incomingItems.length) {
    throw new Error('Order must contain at least one item');
  }

  const items = incomingItems.map((entry) => {
    const menuItemId = Number(entry.menuItemId);
    const quantity = Number(entry.quantity);

    if (!Number.isInteger(menuItemId) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid item payload');
    }

    const menuItem = menuItems.find((m) => m.id === menuItemId);
    if (!menuItem) {
      throw new Error(`Menu item not found for id ${menuItemId}`);
    }

    const lineTotal = menuItem.price * quantity;
    return {
      menuItemId,
      name: menuItem.name,
      price: menuItem.price,
      quantity,
      lineTotal,
    };
  });

  const subtotalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

  let comboName = null;
  let discountPercent = 0;
  if (combo) {
    const name = String(combo.name || '').trim();
    const percent = Number(combo.discountPercent);

    if (!name) {
      throw new Error('Combo name is required when combo is provided');
    }

    if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
      throw new Error('Invalid combo discount percent');
    }

    comboName = name;
    discountPercent = percent;
  }

  const discountAmount = roundMoney((subtotalAmount * discountPercent) / 100);
  const totalAmount = roundMoney(Math.max(0, subtotalAmount - discountAmount));

  const order = {
    id: orderCounter++,
    customerName,
    items,
    subtotalAmount,
    discountAmount,
    comboName,
    totalAmount,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  return order;
}

function updateOrderStatus(id, status) {
  const order = orders.find((o) => o.id === id);
  if (!order) {
    throw new Error('Order not found');
  }

  if (!STATUS_FLOW.includes(status)) {
    throw new Error('Invalid status');
  }

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextIndex = STATUS_FLOW.indexOf(status);

  if (nextIndex < currentIndex) {
    throw new Error('Order status cannot move backwards');
  }

  if (nextIndex > currentIndex + 1) {
    throw new Error('Order status can only move one step at a time');
  }

  order.status = status;
  return order;
}

function inLastDays(isoDate, days) {
  const now = Date.now();
  const time = new Date(isoDate).getTime();
  return now - time <= days * 24 * 60 * 60 * 1000;
}

function getRangeStats(days) {
  const scopedOrders = orders.filter((o) => inLastDays(o.createdAt, days));
  const completedOrders = scopedOrders.filter((o) => o.status === 'Completed');

  const totalOrders = scopedOrders.length;
  const completedCount = completedOrders.length;
  const pendingCount = totalOrders - completedCount;
  const revenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  return { days, totalOrders, completedCount, pendingCount, revenue };
}

function getDashboardSummary() {
  const todayOrders = orders.filter((o) => inLastDays(o.createdAt, 1));
  const todayCompleted = todayOrders.filter((o) => o.status === 'Completed');

  return {
    todayOrders: todayOrders.length,
    pendingOrders: orders.filter((o) => o.status !== 'Completed').length,
    completedOrders: orders.filter((o) => o.status === 'Completed').length,
    todayRevenue: todayCompleted.reduce((sum, o) => sum + o.totalAmount, 0),
  };
}

function getWeeklyReport() {
  return getRangeStats(7);
}

function getMonthlyReport() {
  return getRangeStats(30);
}

function getTopItems(limit = 5) {
  const tally = new Map();

  for (const order of orders) {
    if (order.status !== 'Completed') {
      continue;
    }

    for (const item of order.items) {
      const existing = tally.get(item.menuItemId) || { name: item.name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.lineTotal;
      tally.set(item.menuItemId, existing);
    }
  }

  return [...tally.entries()]
    .map(([menuItemId, value]) => ({
      menuItemId,
      name: value.name,
      quantitySold: value.quantity,
      revenue: value.revenue,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, Math.max(1, limit));
}

module.exports = {
  getMenu,
  getOrders,
  createOrder,
  updateOrderStatus,
  getDashboardSummary,
  getWeeklyReport,
  getMonthlyReport,
  getTopItems,
};
