const router = require('express').Router();
const {
  createReview,
  getReviewsForProduct,
  addReply,
  voteHelpful
} = require('../controllers/review.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.post('/', protect, createReview);
router.get('/product/:productId', getReviewsForProduct);
router.post('/:id/reply', protect, requireRole('seller'), addReply);
router.post('/:id/helpful', protect, voteHelpful);

module.exports = router;
