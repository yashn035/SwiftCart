const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processed'], default: 'pending' },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payout', payoutSchema);
