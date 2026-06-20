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
    const { items, couponCode, pointsApplied } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    let subtotal = 0;
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
      subtotal += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        sellerId: product.sellerId,
        quantity: item.quantity,
        price: product.price,
        size: item.size || '',
        color: item.color || '',
      });
    }

    let discountAmount = 0;
    let pointsAppliedDiscount = 0;

    // Apply Coupon
    if (couponCode) {
      const Coupon = require('../models/Coupon');
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
      if (coupon && new Date() <= coupon.expiryDate && subtotal >= coupon.minOrderValue) {
        discountAmount = (subtotal * coupon.discountPercent) / 100;
        if (discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
        discountAmount = Math.round(discountAmount);
      }
    }

    // Apply Loyalty Points (1 point = ₹1 discount)
    if (pointsApplied) {
      const User = require('../models/User');
      const user = await User.findById(req.user._id);
      if (user && user.rewardPoints >= Number(pointsApplied)) {
        pointsAppliedDiscount = Math.min(Number(pointsApplied), subtotal - discountAmount);
        user.rewardPoints -= pointsAppliedDiscount;
        await user.save();
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount - pointsAppliedDiscount);

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
        couponCode,
        discountAmount,
        pointsApplied: pointsAppliedDiscount,
        pointsAppliedDiscount,
      });

      return res.status(201).json({
        orderId: order._id,
        razorpayOrderId: mockRzpOrderId,
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        keyId: 'DEV_MODE',
        devMode: true,
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
      couponCode,
      discountAmount,
      pointsApplied: pointsAppliedDiscount,
      pointsAppliedDiscount,
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
// Helper to reward points upon payment success
const rewardPointsForOrder = async (order) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(order.buyerId);
    if (user) {
      // 1 point for every ₹100 spent
      let pointsEarned = Math.floor(order.totalAmount / 100);

      // Multipliers based on level
      if (user.userLevel === 'silver') pointsEarned = Math.floor(pointsEarned * 1.1);
      else if (user.userLevel === 'gold') pointsEarned = Math.floor(pointsEarned * 1.25);
      else if (user.userLevel === 'platinum') pointsEarned = Math.floor(pointsEarned * 1.5);

      user.rewardPoints += pointsEarned;

      // Upgrade level progression
      if (user.rewardPoints >= 1000) user.userLevel = 'platinum';
      else if (user.rewardPoints >= 500) user.userLevel = 'gold';
      else if (user.rewardPoints >= 200) user.userLevel = 'silver';

      await user.save();
      console.log(`🎁 User ${user.name} earned ${pointsEarned} reward points. New Total: ${user.rewardPoints}. Tier: ${user.userLevel}`);
    }
  } catch (err) {
    console.error('Error rewarding points:', err);
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

      await rewardPointsForOrder(order);

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

    await rewardPointsForOrder(order);

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

// ─── GET /api/orders/:id/invoice ──────────────────────────────────────────────
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'name email')
      .populate('items.productId', 'name price');

    if (!order) return res.status(404).send('<h1>Order not found</h1>');

    const isBuyer = order.buyerId._id.toString() === req.user._id.toString();
    const isSeller = order.items.some(item => item.sellerId.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isBuyer && !isSeller && !isAdmin) {
      return res.status(403).send('<h1>Not authorized to view this invoice</h1>');
    }

    const itemsRows = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.productId?.name || 'Product'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - SwiftCart</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); border-radius: 8px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
          .logo { font-size: 28px; font-weight: bold; color: #7c3aed; }
          .details { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px; line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f5f5f5; font-weight: bold; text-align: left; padding: 10px; border-bottom: 2px solid #ddd; }
          .total { text-align: right; font-size: 16px; line-height: 1.8; }
          .total span { font-weight: bold; font-size: 20px; color: #7c3aed; }
          .print-btn { background: #7c3aed; color: #fff; border: none; padding: 10px 20px; font-size: 14px; border-radius: 6px; cursor: pointer; margin-bottom: 20px; }
          @media print {
            .print-btn { display: none; }
            body { padding: 0; }
            .invoice-box { border: none; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right;">
          <button class="print-btn" onclick="window.print()">Print / Download PDF</button>
        </div>
        <div class="invoice-box">
          <div class="header">
            <div class="logo">SwiftCart</div>
            <div style="text-align: right; font-size: 14px;">
              <strong>Invoice #:</strong> ${order._id}<br>
              <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN')}<br>
              <strong>Payment:</strong> ${order.paymentStatus.toUpperCase()}
            </div>
          </div>
          <div class="details">
            <div>
              <strong>Billed To:</strong><br>
              ${order.buyerId?.name || 'Buyer'}<br>
              ${order.buyerId?.email || ''}
            </div>
            <div style="text-align: right;">
              <strong>Merchant:</strong><br>
              SwiftCart Marketplace Ltd.<br>
              support@swiftcart.com
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="padding: 10px;">Item Description</th>
                <th style="padding: 10px; text-align: right;">Unit Price</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="total">
            Subtotal: ₹${(order.totalAmount + order.discountAmount).toLocaleString('en-IN')}<br>
            Discount Applied: -₹${order.discountAmount.toLocaleString('en-IN')}<br>
            Loyalty Rebate: -₹${order.pointsAppliedDiscount.toLocaleString('en-IN')}<br>
            <span>Total: ₹${order.totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send('<h1>Internal Server Error</h1>');
  }
};

// ─── POST /api/orders/:id/return ──────────────────────────────────────────────
const requestReturn = async (req, res) => {
  try {
    const { reason, comments } = req.body;
    if (!reason) return res.status(400).json({ message: 'Reason for return is required' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.buyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to request return for this order' });
    }

    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ message: 'Can only request return for delivered orders' });
    }

    order.returnRequest = {
      status: 'requested',
      reason,
      comments: comments || '',
      createdAt: new Date(),
    };

    await order.save();
    res.json({ message: 'Return request submitted successfully', order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/orders/:id/refund ─────────────────────────────────────────────
const processRefund = async (req, res) => {
  try {
    const { status, amount } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.returnRequest?.status !== 'requested') {
      return res.status(400).json({ message: 'No active return request for this order' });
    }

    order.returnRequest.status = status;
    
    if (status === 'approved') {
      const refundAmount = Number(amount) || order.totalAmount;
      order.refundRequest = {
        status: 'approved',
        reason: order.returnRequest.reason,
        amount: refundAmount,
        createdAt: new Date(),
      };
      order.orderStatus = 'cancelled';
      order.paymentStatus = 'Refunded';

      const paymentId = order.paymentId || order.razorpayPaymentId;
      if (paymentId) {
        const Transaction = require('../models/Transaction');
        const razorpay = require('../config/razorpay');
        const hasRealRazorpayKeys = () => {
          const id = process.env.RAZORPAY_KEY_ID || '';
          const secret = process.env.RAZORPAY_KEY_SECRET || '';
          return id && secret && !id.includes('xxxx') && !secret.includes('xxxx') && id !== 'rzp_test_placeholder';
        };

        if (!hasRealRazorpayKeys() || paymentId.startsWith('pay_DEV_')) {
          await Transaction.create({
            orderId: order._id,
            paymentId,
            amount: refundAmount,
            status: 'Refunded',
            type: 'refund',
            refundId: `ref_DEV_${Date.now()}`,
            rawResponse: { devMode: true }
          });
        } else {
          try {
            const refund = await razorpay.payments.refund(paymentId, {
              amount: Math.round(refundAmount * 100)
            });
            await Transaction.create({
              orderId: order._id,
              paymentId,
              amount: refundAmount,
              status: 'Refunded',
              type: 'refund',
              refundId: refund.id,
              rawResponse: refund
            });
          } catch (err) {
            console.error('Razorpay API refund error:', err);
          }
        }
      }
    } else {
      order.returnRequest.comments = `Rejected: ${req.body.comments || 'Does not meet criteria'}`;
    }

    await order.save();
    res.json({ message: `Return request marked as ${status}`, order });
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
  downloadInvoice,
  requestReturn,
  processRefund,
  setIo,
};

