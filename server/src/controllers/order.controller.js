const Order = require('../models/Order');
const Product = require('../models/Product');
const crypto = require('crypto');

// ─── Razorpay detection ───────────────────────────────────────────────────────
const hasRealRazorpayKeys = () => {
  const id = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return (
    id.startsWith('rzp_') &&
    !id.includes('YOUR_KEY') &&
    secret.length > 10 &&
    !secret.includes('YOUR_RAZORPAY')
  );
};

// Lazily initialized Razorpay instance
let razorpay;
const getRazorpay = () => {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// Socket.io instance — injected from server/index.js
let io;
const setIo = (socketIo) => { io = socketIo; };

// ─── POST /api/orders ─────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        });
      }
      totalAmount += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        sellerId: product.sellerId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // ── DEV MODE: no real Razorpay keys → mock a Razorpay order ──────────────
    if (!hasRealRazorpayKeys()) {
      console.log('⚡ DEV MODE: Mocking Razorpay order (add real keys to .env to use live payments)');

      const mockRzpOrderId = `order_DEV_${Date.now()}`;
      const order = await Order.create({
        buyerId: req.user._id,
        items: orderItems,
        totalAmount,
        razorpayOrderId: mockRzpOrderId,
        paymentStatus: 'pending',
        orderStatus: 'placed',
      });

      return res.status(201).json({
        orderId: order._id,
        razorpayOrderId: mockRzpOrderId,
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        keyId: 'DEV_MODE',
        devMode: true, // <-- client uses this to skip the real modal
      });
    }

    // ── PRODUCTION: real Razorpay order ──────────────────────────────────────
    const rzpOrder = await getRazorpay().orders.create({
      amount: Math.round(totalAmount * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    const order = await Order.create({
      buyerId: req.user._id,
      items: orderItems,
      totalAmount,
      razorpayOrderId: rzpOrder.id,
      paymentStatus: 'pending',
      orderStatus: 'placed',
    });

    res.status(201).json({
      orderId: order._id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      devMode: false,
    });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/orders/verify-payment ─────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Missing orderId' });
    }

    // ── DEV MODE: skip HMAC verification ─────────────────────────────────────
    if (!hasRealRazorpayKeys() || (razorpayOrderId && razorpayOrderId.startsWith('order_DEV_'))) {
      console.log('⚡ DEV MODE: Skipping Razorpay signature verification');

      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: 'paid',
          razorpayPaymentId: `pay_DEV_${Date.now()}`,
          orderStatus: 'placed',
        },
        { new: true }
      );

      if (!order) return res.status(404).json({ message: 'Order not found' });

      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      }

      return res.json({ message: 'Payment verified (dev mode)', order });
    }

    // ── PRODUCTION: HMAC-SHA256 recomputation ─────────────────────────────────
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: 'paid', razorpayPaymentId, orderStatus: 'placed' },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: 'Order not found' });

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
    }

    res.json({ message: 'Payment verified successfully', order });
  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/orders/my ───────────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user._id })
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/orders/seller ───────────────────────────────────────────────────
const getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ 'items.sellerId': req.user._id })
      .populate('buyerId', 'name email')
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/orders/seller/analytics ────────────────────────────────────────
const getSellerAnalytics = async (req, res) => {
  try {
    const orders = await Order.find({
      'items.sellerId': req.user._id,
      paymentStatus: 'paid',
    }).sort({ createdAt: 1 });

    const analyticsMap = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!analyticsMap[date]) analyticsMap[date] = { date, revenue: 0, orders: 0 };

      const sellerRevenue = order.items
        .filter((item) => item.sellerId.toString() === req.user._id.toString())
        .reduce((sum, item) => sum + item.price * item.quantity, 0);

      analyticsMap[date].revenue += sellerRevenue;
      analyticsMap[date].orders += 1;
    }

    res.json(Object.values(analyticsMap));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'packed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const sellerOwnsItem = order.items.some(
      (item) => item.sellerId.toString() === req.user._id.toString()
    );
    if (!sellerOwnsItem) {
      return res.status(403).json({ message: 'You are not the seller for this order' });
    }

    order.orderStatus = status;
    await order.save();

    // Emit real-time event to buyer's Socket.io room
    if (io) {
      io.to(`buyer_${order.buyerId}`).emit('orderStatusUpdated', {
        orderId: order._id,
        status: order.orderStatus,
        updatedAt: new Date(),
      });
    }

    res.json({ message: 'Order status updated', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getMyOrders,
  getSellerOrders,
  getSellerAnalytics,
  updateOrderStatus,
  setIo,
};
