const Product = require('../models/Product');
const User = require('../models/User');

/**
 * GET /api/admin/products — all products across all sellers
 */
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/admin/products/:id — admin deletes any product
 */
const deleteAnyProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted by admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/admin/users — all users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/admin/users/:id — admin deletes a user
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted by admin' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllProducts, deleteAnyProduct, getAllUsers, deleteUser };
