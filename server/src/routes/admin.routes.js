const router = require('express').Router();
const { getAllProducts, deleteAnyProduct, getAllUsers, deleteUser } = require('../controllers/admin.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.get('/products', protect, requireRole('admin'), getAllProducts);
router.delete('/products/:id', protect, requireRole('admin'), deleteAnyProduct);
router.get('/users', protect, requireRole('admin'), getAllUsers);
router.delete('/users/:id', protect, requireRole('admin'), deleteUser);

module.exports = router;
