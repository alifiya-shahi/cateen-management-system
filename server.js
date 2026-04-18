const path = require('path');
const net = require('net');
const express = require('express');
const cors = require('cors');
const {
  getMenu,
  getOrders,
  createOrder,
  updateOrderStatus,
  getDashboardSummary,
  getWeeklyReport,
  getMonthlyReport,
  getTopItems,
} = require('./data/store');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Canteen Management API is running' });
});

app.get('/api/menu', (req, res) => {
  const category = (req.query.category || '').trim().toLowerCase();
  const menu = getMenu();

  if (!category) {
    res.json(menu);
    return;
  }

  const filtered = menu.filter((item) => item.category.toLowerCase() === category);
  res.json(filtered);
});

app.get('/api/orders', (req, res) => {
  res.json(getOrders());
});

app.post('/api/orders', (req, res) => {
  try {
    const order = createOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch('/api/orders/:id/status', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const updated = updateOrderStatus(id, status);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/admin/dashboard', (req, res) => {
  res.json(getDashboardSummary());
});

app.get('/api/reports/weekly', (req, res) => {
  res.json(getWeeklyReport());
});

app.get('/api/reports/monthly', (req, res) => {
  res.json(getMonthlyReport());
});

app.get('/api/reports/top-items', (req, res) => {
  const limit = Number(req.query.limit || 5);
  res.json(getTopItems(limit));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => resolve(false));
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function getAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortFree(port))) {
    port += 1;
  }
  return port;
}

async function startServer() {
  const port = await getAvailablePort(DEFAULT_PORT);
  if (port !== DEFAULT_PORT) {
    console.log(`Port ${DEFAULT_PORT} is busy. Switched to ${port}.`);
  }

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
