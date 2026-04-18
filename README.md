# Canteen Management System

Full-stack project using Node.js + Express.js backend and responsive HTML/CSS/JS frontend.

## Features

- Menu display
- Order system
- Admin dashboard
- Weekly and monthly reports
- Most sold item analysis
- Order status flow (Pending -> Completed)

## Tech Stack

- Backend: Node.js, Express.js
- Frontend: HTML, CSS, Vanilla JavaScript

## Run Locally

1. Install dependencies:
   npm install
2. Start server:
   npm start
3. Open in browser:
   http://localhost:3000

## API Endpoints

- GET /api/health
- GET /api/menu
- GET /api/orders
- POST /api/orders
- PATCH /api/orders/:id/status
- GET /api/admin/dashboard
- GET /api/reports/weekly
- GET /api/reports/monthly
- GET /api/reports/top-items?limit=5
