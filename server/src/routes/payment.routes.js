const router = require('express').Router();
const {
  createOrder,
  verifyPayment,
  handleWebhook,
  processRefund,
  addWalletFunds,
  redeemGiftCard,
  getWalletBalance,
  getSellerPayouts,
  createPayout
} = require('../controllers/payment.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/webhook', handleWebhook);
router.post('/refund', protect, requireRole('admin'), processRefund);

// Wallet Endpoints
router.post('/wallet/add', protect, addWalletFunds);
router.post('/wallet/redeem', protect, redeemGiftCard);
router.get('/wallet/balance', protect, getWalletBalance);

// Payouts Endpoints
router.get('/payouts', protect, requireRole('seller'), getSellerPayouts);
router.post('/payouts', protect, requireRole('admin'), createPayout);

module.exports = router;
