const router = require('express').Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  bulkCreateProducts,
} = require('../controllers/product.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.get('/', getProducts);
router.get('/seller/mine', protect, requireRole('seller'), getSellerProducts);
router.get('/:id', getProduct);
router.post('/', protect, requireRole('seller'), createProduct);
router.post('/bulk', protect, requireRole('seller'), bulkCreateProducts);
router.put('/:id', protect, requireRole('seller'), updateProduct);
router.delete('/:id', protect, requireRole('seller', 'admin'), deleteProduct);

module.exports = router;
