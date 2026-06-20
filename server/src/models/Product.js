const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema(
  {
    size: { type: String },
    color: { type: String },
    price: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: [{ type: String }],
    
    // Premium additions
    variants: [productVariantSchema],
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    discountExpiry: { type: Date },
    isApproved: { type: Boolean, default: true }, // Default approved for ease of use
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);

