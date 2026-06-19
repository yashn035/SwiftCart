require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const seed = async () => {
  let uri = process.env.MONGO_URI;
  let mongod;

  // Same fallback logic as db.js
  const isPlaceholder =
    !uri ||
    uri.includes('YOUR_USERNAME') ||
    uri.includes('YOUR_PASSWORD') ||
    uri === 'mongodb://localhost:27017/swiftcart';

  if (isPlaceholder) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
      console.log('⚠️  Using in-memory MongoDB for seed (standalone run — data will be lost)');
      console.log('   Tip: Run seed via the server process so data persists during the session.\n');
    } catch (err) {
      console.error('❌ Failed to start in-memory MongoDB:', err.message);
      process.exit(1);
    }
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    const categories = [
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Clothing', slug: 'clothing' },
      { name: 'Books', slug: 'books' },
      { name: 'Home & Garden', slug: 'home-garden' },
      { name: 'Sports', slug: 'sports' },
    ];
    await Category.insertMany(categories);

    const adminHash  = await bcrypt.hash('admin123', 10);
    const sellerHash = await bcrypt.hash('seller123', 10);
    const buyerHash  = await bcrypt.hash('buyer123', 10);
    const seller2Hash= await bcrypt.hash('seller2123', 10);

    const [, seller, , seller2] = await User.insertMany([
      { name: 'Admin User',  email: 'admin@swiftcart.com',   passwordHash: adminHash,   role: 'admin'  },
      { name: 'Tech Store',  email: 'seller@swiftcart.com',  passwordHash: sellerHash,  role: 'seller' },
      { name: 'John Buyer',  email: 'buyer@swiftcart.com',   passwordHash: buyerHash,   role: 'buyer'  },
      { name: 'Fashion Hub', email: 'seller2@swiftcart.com', passwordHash: seller2Hash, role: 'seller' },
    ]);
    console.log('👥 Seeded 4 users');

    const products = [
      { sellerId: seller._id,  name: 'Sony WH-1000XM5 Headphones', category: 'Electronics',
        description: 'Industry-leading noise cancelling with 30-hour battery. Perfect for work and travel.',
        price: 24999, stock: 15,
        images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Apple AirPods Pro 2nd Gen', category: 'Electronics',
        description: 'Active Noise Cancellation, Transparency mode, Spatial audio with dynamic head tracking.',
        price: 19999, stock: 8,
        images: ['https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Mechanical Gaming Keyboard', category: 'Electronics',
        description: 'RGB backlit mechanical keyboard with Cherry MX switches. USB-C detachable cable.',
        price: 6499, stock: 20,
        images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80'] },
      { sellerId: seller._id,  name: '4K Ultra HD Smart Monitor 27"', category: 'Electronics',
        description: '27-inch 4K IPS display, 144Hz, HDR400. Perfect for professionals and gamers.',
        price: 34999, stock: 5,
        images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Logitech MX Master 3 Mouse', category: 'Electronics',
        description: 'Advanced wireless mouse, hyper-fast scroll, works on any surface. 70-day battery.',
        price: 8999, stock: 30,
        images: ['https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Premium Cotton Hoodie', category: 'Clothing',
        description: 'Ultra-soft 100% organic cotton hoodie with kangaroo pocket. Pre-shrunk, machine washable.',
        price: 1999, stock: 50,
        images: ['https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Slim Fit Denim Jeans', category: 'Clothing',
        description: 'Classic slim fit jeans from premium stretch denim. Comfortable all-day wear.',
        price: 2499, stock: 40,
        images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Minimalist White Sneakers', category: 'Sports',
        description: 'Clean minimal design, all-day comfort. Breathable mesh upper, cushioned insole.',
        price: 3499, stock: 25,
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80'] },
      { sellerId: seller._id,  name: 'The Pragmatic Programmer', category: 'Books',
        description: 'One of the most influential books in software development. Required reading.',
        price: 799, stock: 100,
        images: ['https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80'] },
      { sellerId: seller._id,  name: 'Clean Code by Robert C. Martin', category: 'Books',
        description: 'A handbook of agile software craftsmanship. Write code that is clean and maintainable.',
        price: 699, stock: 75,
        images: ['https://images.unsplash.com/photo-1589998059171-988d887df646?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Smart LED Desk Lamp', category: 'Home & Garden',
        description: 'Touch-sensitive, 5 color temps, 5 brightness levels. Built-in USB charging port.',
        price: 1499, stock: 35,
        images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80'] },
      { sellerId: seller2._id, name: 'Ergonomic Office Chair', category: 'Home & Garden',
        description: 'Lumbar support, adjustable armrests, breathable mesh back. 360° swivel.',
        price: 12999, stock: 10,
        images: ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80'] },
    ];

    await Product.insertMany(products);
    console.log(`📦 Seeded ${products.length} products`);

    console.log('\n✅ Seed complete! Demo credentials:');
    console.log('  Admin:    admin@swiftcart.com   / admin123');
    console.log('  Seller:   seller@swiftcart.com  / seller123');
    console.log('  Seller2:  seller2@swiftcart.com / seller2123');
    console.log('  Buyer:    buyer@swiftcart.com   / buyer123');

    if (mongod) await mongod.stop();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    if (mongod) await mongod.stop();
    process.exit(1);
  }
};

seed();
