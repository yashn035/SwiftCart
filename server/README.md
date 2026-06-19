# SwiftCart Backend

Express + MongoDB + Socket.io API server for the SwiftCart marketplace.  
**Companion repo**: [SwiftCart Frontend](../SwiftCart-frontend) — the React/Vite client that consumes this API.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (≥ 18) |
| Framework | Express 4 |
| Database | MongoDB via Mongoose (Atlas in production, in-memory fallback for dev) |
| Auth | JWT (7-day expiry) + bcryptjs |
| Real-time | Socket.io 4 |
| Payments | Razorpay (sandbox-safe dev mode built in) |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | no | Port to listen on (default `5000`) |
| `MONGO_URI` | yes | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | Long random secret for signing JWTs |
| `RAZORPAY_KEY_ID` | no | Razorpay key (omit to use built-in dev mode) |
| `RAZORPAY_KEY_SECRET` | no | Razorpay secret |
| `CORS_ORIGIN` | production | Frontend URL (e.g. `https://swiftcart-frontend.vercel.app`) |

### 3. Run in development

```bash
npm run dev      # nodemon with hot-reload
```

Server starts on **http://localhost:5000**.

If `MONGO_URI` is unset or unreachable, the server automatically falls back to an **in-memory MongoDB instance** (data resets on restart — perfect for quick dev/demo).

### 4. Seed data

On first start with an empty database, the server **auto-seeds** 4 users and 12 products:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@swiftcart.com | admin123 |
| Seller | seller@swiftcart.com | seller123 |
| Seller 2 | seller2@swiftcart.com | seller2123 |
| Buyer | buyer@swiftcart.com | buyer123 |

---

## API reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | public | Register buyer or seller |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Fetch current user |
| GET | `/api/products` | public | List/search/filter products |
| GET | `/api/products/:id` | public | Single product |
| POST | `/api/products` | seller | Create product |
| PUT | `/api/products/:id` | seller | Update own product |
| DELETE | `/api/products/:id` | seller/admin | Delete product |
| GET | `/api/products/seller/mine` | seller | Seller's own products |
| POST | `/api/orders` | buyer | Create order + Razorpay order |
| POST | `/api/orders/verify-payment` | buyer | Verify Razorpay payment |
| GET | `/api/orders/my` | buyer | Buyer's orders |
| GET | `/api/orders/seller` | seller | Orders containing seller's items |
| PATCH | `/api/orders/:id/status` | seller | Update order status (emits Socket.io event) |
| GET | `/api/admin/products` | admin | All products |
| DELETE | `/api/admin/products/:id` | admin | Delete any product |
| GET | `/api/admin/users` | admin | All users |
| DELETE | `/api/admin/users/:id` | admin | Delete any user |
| GET | `/api/health` | public | Health check `{ status: 'ok' }` |

---

## Socket.io events

| Event (server→client) | Payload | Description |
|-----------------------|---------|-------------|
| `orderStatusUpdated` | `{ orderId, status, updatedAt }` | Emitted to `buyer_<userId>` room when a seller updates an order |

| Event (client→server) | Payload | Description |
|-----------------------|---------|-------------|
| `joinBuyerRoom` | `buyerId` | Buyer joins their personal room |

---

## Deployment (Render)

1. Create a new **Web Service** on [Render](https://render.com), connected to this repo.
2. Build command: *(none needed)*  
   Start command: `node src/index.js`
3. Set environment variables (at minimum `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`).
4. Deploy.

> **CORS**: `CORS_ORIGIN` must be set to the exact Vercel frontend URL (no trailing slash).

---

## Project structure

```
src/
├── config/
│   └── db.js              # MongoDB connect (Atlas + in-memory fallback)
├── controllers/
│   ├── auth.controller.js
│   ├── product.controller.js
│   ├── order.controller.js    # Razorpay + Socket.io emission
│   └── admin.controller.js
├── middleware/
│   └── auth.middleware.js     # JWT protect + RBAC requireRole
├── models/
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   └── Category.js
├── routes/
│   ├── auth.routes.js
│   ├── product.routes.js
│   ├── order.routes.js
│   └── admin.routes.js
└── index.js               # App entry, Socket.io, auto-seed
```

---

## Environment variables reference

See [`.env.example`](.env.example).
