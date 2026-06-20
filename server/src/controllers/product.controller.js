const Product = require('../models/Product');

/**
 * GET /api/products
 * Supports: ?search=, ?category=, ?minPrice=, ?maxPrice=, ?page=, ?limit=
 */
const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sellerId, page = 1, limit = 12 } = req.query;
    const query = {};

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (search) {
      // Use regex search as fallback for text index compatibility
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      query.category = { $regex: category, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('sellerId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.json({
      products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/products/:id
 */
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'name email');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/products — seller only
 */
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, images } = req.body;

    if (!name || !description || price === undefined || !category) {
      return res.status(400).json({ message: 'Required fields: name, description, price, category' });
    }

    const product = await Product.create({
      sellerId: req.user._id,
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      images: images || [],
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/products/:id — seller only, must own product
 */
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own products' });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/products/:id — seller (own) or admin
 */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (
      req.user.role !== 'admin' &&
      product.sellerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'You can only delete your own products' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/products/seller/mine — seller's own products
 */
const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const bulkCreateProducts = async (req, res) => {
  try {
    const productsData = req.body;
    if (!Array.isArray(productsData) || productsData.length === 0) {
      return res.status(400).json({ message: 'Payload must be a non-empty array of products' });
    }

    const parsedProducts = productsData.map((p) => {
      if (!p.name || !p.description || p.price === undefined || !p.category) {
        throw new Error('Required fields missing for some products: name, description, price, category');
      }
      return {
        sellerId: req.user._id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        category: p.category,
        stock: Number(p.stock) || 0,
        images: p.images || [],
        variants: p.variants || [],
        isApproved: true, // Auto-approve on dev bulk upload
      };
    });

    const products = await Product.insertMany(parsedProducts);
    res.status(201).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  bulkCreateProducts,
};

