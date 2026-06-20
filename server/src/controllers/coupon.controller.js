const Coupon = require('../models/Coupon');

/**
 * GET /api/coupons
 * List all active coupons
 */
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ active: true, expiryDate: { $gt: new Date() } });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/coupons
 * Create a new coupon (Admin only)
 */
const createCoupon = async (req, res) => {
  try {
    const { code, discountPercent, maxDiscount, minOrderValue, expiryDate } = req.body;
    if (!code || !discountPercent || !maxDiscount || !expiryDate) {
      return res.status(400).json({ message: 'Code, discountPercent, maxDiscount, and expiryDate are required' });
    }

    const exists = await Coupon.findOne({ code: code.toUpperCase() });
    if (exists) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercent: Number(discountPercent),
      maxDiscount: Number(maxDiscount),
      minOrderValue: Number(minOrderValue) || 0,
      expiryDate: new Date(expiryDate),
    });

    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/coupons/validate
 * Validate a coupon and check if it's active & applicable
 */
const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code || orderAmount === undefined) {
      return res.status(400).json({ message: 'Code and orderAmount are required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or inactive coupon code' });
    }

    if (new Date() > coupon.expiryDate) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    if (Number(orderAmount) < coupon.minOrderValue) {
      return res.status(400).json({ message: `Minimum order value for this coupon is ₹${coupon.minOrderValue}` });
    }

    // Calculate discount
    let discount = (Number(orderAmount) * coupon.discountPercent) / 100;
    if (discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount: Math.round(discount),
      minOrderValue: coupon.minOrderValue,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/coupons/:id
 * Delete a coupon (Admin only)
 */
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCoupons, createCoupon, validateCoupon, deleteCoupon };
