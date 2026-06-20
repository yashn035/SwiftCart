const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    size: { type: String },
    color: { type: String },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'pending', 'paid', 'failed'],
      default: 'Pending',
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    paymentMethod: { type: String },
    paymentId: { type: String },
    transactionId: { type: String },
    orderStatus: {
      type: String,
      enum: ['placed', 'packed', 'shipped', 'delivered', 'cancelled'],
      default: 'placed',
    },
    
    // Premium fields
    couponCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    pointsApplied: { type: Number, default: 0 },
    pointsAppliedDiscount: { type: Number, default: 0 },
    
    returnRequest: {
      status: { type: String, enum: ['none', 'requested', 'approved', 'rejected'], default: 'none' },
      reason: { type: String },
      comments: { type: String },
      createdAt: { type: Date },
    },
    
    refundRequest: {
      status: { type: String, enum: ['none', 'requested', 'approved', 'rejected'], default: 'none' },
      reason: { type: String },
      amount: { type: Number, default: 0 },
      createdAt: { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

