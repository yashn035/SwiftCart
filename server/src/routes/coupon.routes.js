const router = require('express').Router();
const { getCoupons, createCoupon, validateCoupon, deleteCoupon } = require('../controllers/coupon.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.get('/', protect, getCoupons);
router.post('/validate', protect, validateCoupon);
router.post('/', protect, requireRole('admin'), createCoupon);
router.delete('/:id', protect, requireRole('admin'), deleteCoupon);

module.exports = router;
