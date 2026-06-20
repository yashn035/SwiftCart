const mongoose = require('mongoose');

const storeReviewSchema = new mongoose.Schema(
  {
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

const storeSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    logo: { type: String, default: '' },
    banner: { type: String, default: '' },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reviews: [storeReviewSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Store', storeSchema);
