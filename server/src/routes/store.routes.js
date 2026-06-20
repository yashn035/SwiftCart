const router = require('express').Router();
const { getStoreById, toggleFollowStore, getMyStore, updateMyStore, leaveStoreReview } = require('../controllers/store.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.get('/mine', protect, requireRole('seller'), getMyStore);
router.put('/mine', protect, requireRole('seller'), updateMyStore);
router.get('/:id', protect, getStoreById);
router.post('/:id/follow', protect, toggleFollowStore);
router.post('/:id/review', protect, requireRole('buyer'), leaveStoreReview);

module.exports = router;
