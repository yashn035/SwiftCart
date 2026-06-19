# SwiftCart Frontend

React + Vite client for the SwiftCart marketplace.  
**Companion repo**: [SwiftCart Backend](../SwiftCart-backend) — the Express + MongoDB + Socket.io API server that this frontend talks to.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 8 |
| Routing | React Router v7 |
| HTTP client | Axios (with JWT interceptor) |
| Real-time | Socket.io-client |
| UI | TailwindCSS + Lucide icons |
| Charts | Recharts |
| Notifications | react-hot-toast |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required in | Description |
|----------|------------|-------------|
| `VITE_API_URL` | **Production only** | Full URL of the backend (e.g. `https://swiftcart-backend.onrender.com`). Leave blank in dev — Vite's proxy handles it. |

### 3. Run in development

```bash
npm run dev
```

Opens at **http://localhost:5173**.  
The Vite dev server proxies `/api` and `/socket.io` → `http://localhost:5000` (or `VITE_API_URL` if set).  
**The backend must be running** before the frontend will work.

### 4. Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

---

## Deployment (Vercel)

1. Import this repo into [Vercel](https://vercel.com).
2. Framework preset: **Vite**.
3. Set the environment variable `VITE_API_URL` to your deployed backend URL (no trailing slash).
4. Deploy. Vercel handles the build automatically.

> **CORS**: after deploying, set `CORS_ORIGIN` in the backend's environment to your Vercel deployment URL (e.g. `https://swiftcart-frontend.vercel.app`).

---

## Project structure

```
src/
├── api/          # Axios instance + endpoint wrappers
├── components/   # Reusable UI components
├── context/      # React contexts (Auth, Cart)
├── hooks/        # Custom hooks (useSocket)
└── pages/        # Route-level page components
    ├── Home.jsx
    ├── Products.jsx
    ├── ProductDetail.jsx
    ├── Cart.jsx
    ├── Checkout.jsx      # Razorpay payment flow
    ├── MyOrders.jsx      # Live order tracking via Socket.io
    ├── Register.jsx
    ├── Login.jsx
    ├── SellerDashboard.jsx
    └── AdminPanel.jsx
```

---

## Environment variables reference

See [`.env.example`](.env.example).
