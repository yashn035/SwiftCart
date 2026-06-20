const Store = require('../models/Store');
const User = require('../models/User');

/**
 * GET /api/stores/:id
 * Retrieve public details of a seller's store
 */
const getStoreById = async (req, res) => {
  try {
    let store = await Store.findOne({ sellerId: req.params.id });
    if (!store) {
      // Create a default store profile if they are a seller and don't have one yet
      const seller = await User.findById(req.params.id);
      if (!seller || seller.role !== 'seller') {
        return res.status(404).json({ message: 'Store or seller not found' });
      }
      store = await Store.create({
        sellerId: seller._id,
        name: `${seller.name}'s Store`,
        description: 'Welcome to my premium store on SwiftCart!',
      });
    }

    const isFollowing = store.followers.includes(req.user?._id);

    res.json({
      ...store.toObject(),
      isFollowing,
      followersCount: store.followers.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/stores/:id/follow
 * Toggle follow/unfollow on a store
 */
const toggleFollowStore = async (req, res) => {
  try {
    const store = await Store.findOne({ sellerId: req.params.id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    const user = await User.findById(req.user._id);
    const storeIndex = store.followers.indexOf(user._id);
    const userIndex = user.followedStores.indexOf(store.sellerId);

    let followed = false;

    if (storeIndex === -1) {
      store.followers.push(user._id);
      user.followedStores.push(store.sellerId);
      followed = true;
    } else {
      store.followers.splice(storeIndex, 1);
      user.followedStores.splice(userIndex, 1);
    }

    await Promise.all([store.save(), user.save()]);

    res.json({
      success: true,
      followed,
      followersCount: store.followers.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/stores/mine
 * Get own store profile (Seller only)
 */
const getMyStore = async (req, res) => {
  try {
    let store = await Store.findOne({ sellerId: req.user._id });
    if (!store) {
      store = await Store.create({
        sellerId: req.user._id,
        name: `${req.user.name}'s Store`,
        description: 'Welcome to my store!',
      });
    }
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /api/stores/mine
 * Update own store profile (Seller only)
 */
const updateMyStore = async (req, res) => {
  try {
    const { name, description, logo, banner } = req.body;
    let store = await Store.findOne({ sellerId: req.user._id });
    if (!store) {
      store = new Store({ sellerId: req.user._id });
    }

    if (name) store.name = name;
    if (description !== undefined) store.description = description;
    if (logo !== undefined) store.logo = logo;
    if (banner !== undefined) store.banner = banner;

    await store.save();
    res.json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/stores/:id/review
 * Leave store rating & review (Buyer only)
 */
const leaveStoreReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating) return res.status(400).json({ message: 'Rating is required' });

    const store = await Store.findOne({ sellerId: req.params.id });
    if (!store) return res.status(404).json({ message: 'Store not found' });

    // Remove existing review by this user if any
    store.reviews = store.reviews.filter((r) => r.buyerId.toString() !== req.user._id.toString());

    store.reviews.push({
      buyerId: req.user._id,
      buyerName: req.user.name,
      rating: Number(rating),
      comment: comment || '',
    });

    // Update overall rating average
    const totalRating = store.reviews.reduce((sum, r) => sum + r.rating, 0);
    store.rating = Number((totalRating / store.reviews.length).toFixed(1));

    await store.save();
    res.status(201).json(store);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getStoreById, toggleFollowStore, getMyStore, updateMyStore, leaveStoreReview };
