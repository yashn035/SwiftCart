require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { setIo } = require('./controllers/order.controller');

// Auto-seed helper for in-memory dev mode
const autoSeed = async () => {
  const User = require('./models/User');
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('🌱 No users found — running auto-seed...');
    const bcrypt = require('bcryptjs');
    const Category = require('./models/Category');
    const Product = require('./models/Product');

    const [adminH, sellerH, buyerH, seller2H] = await Promise.all([
      bcrypt.hash('admin123', 10), bcrypt.hash('seller123', 10),
      bcrypt.hash('buyer123', 10), bcrypt.hash('seller2123', 10),
    ]);
    await Category.insertMany([
      { name: 'Electronics', slug: 'electronics' }, { name: 'Clothing', slug: 'clothing' },
      { name: 'Books', slug: 'books' }, { name: 'Home & Garden', slug: 'home-garden' }, { name: 'Sports', slug: 'sports' },
    ]);
    const [, seller, , seller2] = await User.insertMany([
      { name: 'Admin User',  email: 'admin@swiftcart.com',   passwordHash: adminH,   role: 'admin'  },
      { name: 'Tech Store',  email: 'seller@swiftcart.com',  passwordHash: sellerH,  role: 'seller' },
      { name: 'John Buyer',  email: 'buyer@swiftcart.com',   passwordHash: buyerH,   role: 'buyer'  },
      { name: 'Fashion Hub', email: 'seller2@swiftcart.com', passwordHash: seller2H, role: 'seller' },
    ]);
    await Product.insertMany([
      { sellerId: seller._id,  name: 'Sony WH-1000XM5 Headphones', category: 'Electronics', description: 'Industry-leading noise cancelling with 30-hour battery. Perfect for work and travel.', price: 24999, stock: 15, images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Apple AirPods Pro 2nd Gen',   category: 'Electronics', description: 'Active Noise Cancellation, Transparency mode, Spatial audio.', price: 19999, stock: 8,  images: ['https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Mechanical Gaming Keyboard',   category: 'Electronics', description: 'RGB backlit with Cherry MX switches. USB-C detachable cable.',  price: 6499,  stock: 20, images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'] },
      { sellerId: seller._id,  name: '4K Smart Monitor 27"',         category: 'Electronics', description: '4K IPS display, 144Hz, HDR400. Perfect for professionals.',       price: 34999, stock: 5,  images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Logitech MX Master 3 Mouse',   category: 'Electronics', description: 'Advanced wireless mouse. Hyper-fast scroll. 70-day battery.',   price: 8999,  stock: 30, images: ['https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Premium Cotton Hoodie',         category: 'Clothing',    description: 'Ultra-soft 100% organic cotton. Pre-shrunk, machine washable.',   price: 1999,  stock: 50, images: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Slim Fit Denim Jeans',          category: 'Clothing',    description: 'Premium stretch denim. Comfortable all-day wear.',               price: 2499,  stock: 40, images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Minimalist White Sneakers',     category: 'Sports',      description: 'Breathable mesh upper, cushioned insole, durable sole.',         price: 3499,  stock: 25, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'] },
      { sellerId: seller._id,  name: 'The Pragmatic Programmer',      category: 'Books',       description: 'One of the most influential books in software development.',      price: 799,   stock: 100,images: ['https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Clean Code — Robert C. Martin', category: 'Books',       description: 'A handbook of agile software craftsmanship.',                    price: 699,   stock: 75, images: ['https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Smart LED Desk Lamp',           category: 'Home & Garden',description: 'Touch-sensitive, 5 color temps. Built-in USB charging.',        price: 1499,  stock: 35, images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Ergonomic Office Chair',        category: 'Home & Garden',description: 'Lumbar support, mesh back, 360° swivel.',                       price: 12999, stock: 10, images: ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80'] },
    ]);
    console.log('✅ Auto-seeded: 4 users + 12 products');
    console.log('   Admin: admin@swiftcart.com / admin123');
    console.log('   Seller: seller@swiftcart.com / seller123');
    console.log('   Buyer:  buyer@swiftcart.com / buyer123');
  }
};

const app = express();
const server = http.createServer(app);

// CORS_ORIGIN is the preferred env var for the allowed frontend origin.
// CLIENT_URL is kept as a fallback so existing .env files need no change.
const CORS_ORIGIN =
  process.env.CORS_ORIGIN ||
  process.env.CLIENT_URL ||
  'http://localhost:5173';

// --- Socket.io setup ---
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Share io instance with order controller for status events
setIo(io);

// --- Middleware ---
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Routes ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// --- Health Check ---
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// --- Socket.io connection handler ---
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Buyer joins their personal room to receive order updates
  socket.on('joinBuyerRoom', (buyerId) => {
    socket.join(`buyer_${buyerId}`);
    console.log(`📦 Socket ${socket.id} joined room: buyer_${buyerId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await autoSeed();
  server.listen(PORT, () => {
    console.log(`🚀 SwiftCart server running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io listening on port ${PORT}`);
  });
});
