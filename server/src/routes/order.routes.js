const router = require('express').Router();
const {
  createOrder,
  verifyPayment,
  getMyOrders,
  getSellerOrders,
  getSellerAnalytics,
  updateOrderStatus,
  downloadInvoice,
  requestReturn,
  processRefund,
} = require('../controllers/order.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

// Specific routes before parameterized routes
router.get('/my', protect, requireRole('buyer'), getMyOrders);
router.get('/seller', protect, requireRole('seller'), getSellerOrders);
router.get('/seller/analytics', protect, requireRole('seller'), getSellerAnalytics);
router.post('/verify-payment', protect, requireRole('buyer'), verifyPayment);
router.post('/', protect, requireRole('buyer'), createOrder);

router.get('/:id/invoice', protect, downloadInvoice);
router.post('/:id/return', protect, requireRole('buyer'), requestReturn);
router.patch('/:id/refund', protect, requireRole('admin'), processRefund);
router.patch('/:id/status', protect, requireRole('seller'), updateOrderStatus);

module.exports = router;

