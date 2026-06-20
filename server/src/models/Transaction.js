const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    paymentId: { type: String, required: true },
    razorpayOrderId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, required: true }, // e.g. Captured, Refunded, Failed
    type: { type: String, enum: ['payment', 'refund'], default: 'payment' },
    refundId: { type: String },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
