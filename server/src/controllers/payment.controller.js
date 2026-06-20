const crypto = require("crypto");
const razorpay = require("../config/razorpay");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Transaction = require("../models/Transaction");

const hasRealRazorpayKeys = () => {
  const id = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  return id && secret && !id.includes('xxxx') && !secret.includes('xxxx') && id !== 'rzp_test_placeholder';
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
    }
  } catch (err) {
    console.error('Error rewarding points:', err);
  }
};

exports.createOrder = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    if (!hasRealRazorpayKeys()) {
      const mockOrder = {
        id: "order_DEV_" + Date.now(),
        amount: amount * 100,
        currency: "INR",
        receipt: "receipt_mock_" + Date.now(),
        status: "created"
      };
      return res.status(200).json(mockOrder);
    }

    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Missing razorpay_order_id' });
    }

    if (!hasRealRazorpayKeys() || razorpay_order_id.startsWith('order_DEV_')) {
      const filter = orderId ? { _id: orderId } : { razorpayOrderId: razorpay_order_id };
      const order = await Order.findOne(filter);
      if (order) {
        order.paymentStatus = 'Paid';
        order.razorpayPaymentId = `pay_DEV_${Date.now()}`;
        order.paymentId = order.razorpayPaymentId;
        order.transactionId = order.razorpayPaymentId;
        order.paymentMethod = 'Mock';
        await order.save();

        // Decrement stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        await rewardPointsForOrder(order);

        // Store transaction details
        await Transaction.create({
          orderId: order._id,
          paymentId: order.paymentId,
          razorpayOrderId: razorpay_order_id,
          amount: order.totalAmount,
          status: 'Captured',
          type: 'payment',
          rawResponse: { devMode: true }
        });

        return res.status(200).json({
          success: true,
          message: "Payment Verified (Mock)"
        });
      }
      return res.status(404).json({ success: false, message: 'Order not found for mock verification' });
    }

    // Production verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const verified = expected === razorpay_signature;

    if (verified) {
      const filter = orderId ? { _id: orderId } : { razorpayOrderId: razorpay_order_id };
      const order = await Order.findOne(filter);
      if (order) {
        order.paymentStatus = 'Paid';
        order.razorpayPaymentId = razorpay_payment_id;
        order.paymentId = razorpay_payment_id;
        order.transactionId = razorpay_payment_id;
        order.paymentMethod = req.body.paymentMethod || 'Razorpay';
        await order.save();

        // Decrement stock
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        await rewardPointsForOrder(order);

        // Store transaction details
        await Transaction.create({
          orderId: order._id,
          paymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          amount: order.totalAmount,
          status: 'Captured',
          type: 'payment',
          rawResponse: req.body
        });

        return res.status(200).json({
          success: true,
          message: "Payment Verified"
        });
      }
      return res.status(404).json({ success: false, message: 'Order not found' });
    } else {
      const filter = orderId ? { _id: orderId } : { razorpayOrderId: razorpay_order_id };
      await Order.findOneAndUpdate(filter, { paymentStatus: 'Failed' });
      return res.status(400).json({
        success: false,
        message: "Verification Failed"
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'whsec_placeholder';
    const signature = req.headers['x-razorpay-signature'];

    if (signature && secret !== 'whsec_placeholder') {
      const shasum = crypto.createHmac('sha256', secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest('hex');
      if (digest !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`✉️ Razorpay Webhook received: ${event}`);

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const order = await Order.findOne({ razorpayOrderId: orderId });
      if (order && order.paymentStatus !== 'Paid') {
        order.paymentStatus = 'Paid';
        order.razorpayPaymentId = payment.id;
        order.paymentId = payment.id;
        order.transactionId = payment.id;
        order.paymentMethod = payment.method;
        await order.save();

        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }
        await rewardPointsForOrder(order);

        await Transaction.findOneAndUpdate(
          { paymentId: payment.id },
          { status: 'Captured', orderId: order._id, amount: payment.amount / 100, type: 'payment' },
          { upsert: true }
        );
      }
    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      await Order.findOneAndUpdate(
        { razorpayOrderId: orderId },
        { paymentStatus: 'Failed' }
      );
    } else if (event === 'refund.processed') {
      const refund = payload.refund.entity;
      const paymentId = refund.payment_id;
      
      const transaction = await Transaction.findOne({ paymentId });
      if (transaction) {
        await Order.findByIdAndUpdate(transaction.orderId, { paymentStatus: 'Refunded' });
        
        await Transaction.create({
          orderId: transaction.orderId,
          paymentId,
          amount: refund.amount / 100,
          status: 'Refunded',
          type: 'refund',
          refundId: refund.id,
          rawResponse: refund
        });
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.processRefund = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: 'OrderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const paymentId = order.paymentId || order.razorpayPaymentId;
    if (!paymentId) {
      return res.status(400).json({ message: 'No payment ID associated with this order' });
    }

    const refundAmount = amount || order.totalAmount;

    if (!hasRealRazorpayKeys() || paymentId.startsWith('pay_DEV_')) {
      order.paymentStatus = 'Refunded';
      await order.save();

      const transaction = await Transaction.create({
        orderId: order._id,
        paymentId,
        amount: refundAmount,
        status: 'Refunded',
        type: 'refund',
        refundId: `ref_DEV_${Date.now()}`,
        rawResponse: { devMode: true }
      });

      return res.status(200).json({ success: true, message: 'Refund processed successfully (Mock)', transaction });
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(refundAmount * 100)
    });

    order.paymentStatus = 'Refunded';
    await order.save();

    const transaction = await Transaction.create({
      orderId: order._id,
      paymentId,
      amount: refundAmount,
      status: 'Refunded',
      type: 'refund',
      refundId: refund.id,
      rawResponse: refund
    });

    res.status(200).json({ success: true, message: 'Refund processed successfully', refund, transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");
const GiftCard = require("../models/GiftCard");
const Payout = require("../models/Payout");

exports.addWalletFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid positive amount is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.walletBalance = (user.walletBalance || 0) + Number(amount);
    await user.save();

    const walletTx = await WalletTransaction.create({
      userId: user._id,
      amount: Number(amount),
      type: 'credit',
      reason: 'Wallet funds added',
      transactionId: `wtx_${Date.now()}`
    });

    res.json({ success: true, message: `Added ₹${amount} successfully`, walletBalance: user.walletBalance, transaction: walletTx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.redeemGiftCard = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Gift card code is required' });

    const card = await GiftCard.findOne({ code: code.toUpperCase() });
    if (!card) return res.status(404).json({ message: 'Invalid gift card code' });

    if (card.isRedeemed) return res.status(400).json({ message: 'Gift card has already been redeemed' });
    if (new Date() > card.expiryDate) return res.status(400).json({ message: 'Gift card has expired' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    card.isRedeemed = true;
    card.redeemedBy = user._id;
    await card.save();

    user.walletBalance = (user.walletBalance || 0) + card.value;
    await user.save();

    const walletTx = await WalletTransaction.create({
      userId: user._id,
      amount: card.value,
      type: 'credit',
      reason: `Redeemed Gift Card: ${card.code}`,
      transactionId: `wtx_gift_${card.code}`
    });

    res.json({ success: true, message: `Redeemed ₹${card.value} successfully`, walletBalance: user.walletBalance, transaction: walletTx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transactions = await WalletTransaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ walletBalance: user.walletBalance || 0, transactions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSellerPayouts = async (req, res) => {
  try {
    const payouts = await Payout.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPayout = async (req, res) => {
  try {
    const { sellerId, amount } = req.body;
    if (!sellerId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'sellerId and valid positive amount are required' });
    }

    const payout = await Payout.create({
      sellerId,
      amount: Number(amount),
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Payout created successfully', payout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

