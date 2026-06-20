const mongoose = require('mongoose');

const giftCardSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    value: { type: Number, required: true },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiryDate: { type: Date, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GiftCard', giftCardSchema);
