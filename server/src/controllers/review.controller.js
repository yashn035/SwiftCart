const Review = require('../models/Review');
const Order = require('../models/Order');

exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment, images } = req.body;
    if (!productId || !rating || !comment) {
      return res.status(400).json({ message: 'productId, rating, and comment are required' });
    }

    // Check verified purchase (user has a 'paid' order containing this product)
    const hasBought = await Order.findOne({
      buyerId: req.user._id,
      paymentStatus: 'Paid',
      'items.productId': productId
    });

    const review = await Review.create({
      productId,
      userId: req.user._id,
      rating: Number(rating),
      comment,
      images: images || [],
      verifiedPurchase: !!hasBought
    });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReviewsForProduct = async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('userId', 'name')
      .populate('replies.sellerId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addReply = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Reply text is required' });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.replies.push({
      sellerId: req.user._id,
      text
    });

    await review.save();
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.voteHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    review.helpfulVotes += 1;
    await review.save();

    res.json({ success: true, helpfulVotes: review.helpfulVotes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
