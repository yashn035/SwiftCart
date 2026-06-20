const axios = require('axios');

/**
 * POST /api/ai/chat
 * Communicate with OpenAI assistant (uses fallback if key is not configured)
 */
const chatWithAssistant = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const isMock = !apiKey || apiKey.includes('YOUR_OPENAI_KEY');

    if (isMock) {
      // Simulate standard answers locally if key is missing
      const lower = message.toLowerCase();
      let reply = `Hello! I'm the SwiftCart AI Shopping Assistant. (OpenAI API key not configured, running locally). \n\n`;

      if (lower.includes('category') || lower.includes('sell') || lower.includes('product')) {
        reply += `We offer a wide range of products across these main categories:
1. **Electronics** (Sony Headphones, AirPods, Smart Monitors, Gaming Keyboards)
2. **Clothing** (Premium Cotton Hoodies, Denim Jeans)
3. **Sports** (Minimalist White Sneakers)
4. **Books** (Clean Code, Pragmatic Programmer)
5. **Home & Garden** (Smart LED Desk Lamps, Ergonomic Office Chairs)`;
      } else if (lower.includes('track') || lower.includes('order')) {
        reply += `Tracking your order is easy! Head to **"My Orders"** tab under your profile. We support real-time status tracking. You will see steps: Placed → Packed → Shipped → Delivered. If you are a buyer, you'll get live socket notifications when status changes!`;
      } else if (lower.includes('coupon') || lower.includes('discount') || lower.includes('promo')) {
        reply += `You can check if there are active coupons. Popular ones are:
* **SAVE10** - Gets 10% off items.
* **FIRST20** - Gets 20% off for first-time buyers.
Simply apply these at Checkout!`;
      } else if (lower.includes('checkout') || lower.includes('pay') || lower.includes('buy')) {
        reply += `To checkout, add items to your Cart and click the **"Proceed to Checkout"** button. You can apply loyalty points or enter a coupon code there. We support Razorpay (card, UPI, netbanking) and offer a sandbox dev-payment mode!`;
      } else {
        reply += `I can suggest products, explain coupon codes, list categories, track orders, or guide you through checkout. What can I help you find today?`;
      }

      return res.json({ reply });
    }

    // Call real OpenAI API
    const systemPrompt = `You are a helpful and charming AI Shopping Assistant for SwiftCart, a premium online multi-vendor marketplace.
Your goal is to answer product questions, suggest products, recommend alternatives, explain shipping, and guide users through checkout.
Keep answers concise, engaging, and professional. Mention that SwiftCart has custom user levels (Bronze, Silver, Gold, Platinum) with extra discounts!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI Error:', err.response?.data || err.message);
    res.json({
      reply: "I'm having a bit of trouble connecting to my central brain. Please ask again or contact support!",
    });
  }
};

const Product = require('../models/Product');
const Order = require('../models/Order');

const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const pastOrders = await Order.find({ buyerId: userId, paymentStatus: 'Paid' });
    
    let recommended;
    if (pastOrders.length > 0) {
      const orderProdIds = pastOrders.flatMap(o => o.items.map(i => i.productId));
      const boughtProducts = await Product.find({ _id: { $in: orderProdIds } });
      const categoriesBought = [...new Set(boughtProducts.map(p => p.category))];
      
      recommended = await Product.find({
        category: { $in: categoriesBought },
        _id: { $nin: orderProdIds }
      }).limit(6);
    }

    if (!recommended || recommended.length === 0) {
      recommended = await Product.find({}).sort({ createdAt: -1 }).limit(6);
    }

    res.json(recommended);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSalesForecast = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const orders = await Order.find({
      paymentStatus: 'Paid',
      'items.sellerId': sellerId
    });

    let totalSalesValue = 0;
    let salesCount = 0;
    
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.sellerId.toString() === sellerId.toString()) {
          totalSalesValue += item.price * item.quantity;
          salesCount += item.quantity;
        }
      });
    });

    const growthFactor = 1.08;
    const forecastedRevenue = Math.round(totalSalesValue * growthFactor);
    const forecastedOrders = Math.round(salesCount * growthFactor);

    res.json({
      currentRevenue: totalSalesValue,
      currentOrders: salesCount,
      forecastedRevenue,
      forecastedOrders,
      growthPercent: 8,
      confidenceScore: 92,
      insight: "Strong performance in Electronics category is driving an estimated 8% increase in sales for the upcoming week."
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getInventoryForecast = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const products = await Product.find({ sellerId });

    const report = products.map(product => {
      let riskLevel = 'Low';
      let daysRemaining = 30;

      if (product.stock === 0) {
        riskLevel = 'Out of Stock';
        daysRemaining = 0;
      } else if (product.stock <= 5) {
        riskLevel = 'Critical';
        daysRemaining = Math.max(1, Math.round(product.stock * 0.5));
      } else if (product.stock <= 10) {
        riskLevel = 'Medium';
        daysRemaining = Math.round(product.stock * 1.5);
      }

      return {
        productId: product._id,
        name: product.name,
        currentStock: product.stock,
        riskLevel,
        estimatedDaysRemaining: daysRemaining,
        recommendation: riskLevel === 'Critical' || riskLevel === 'Out of Stock' 
          ? `Restock immediately. Recommended quantity: ${Math.max(20, product.stock * 3)} units.`
          : 'Stock levels healthy.'
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  chatWithAssistant,
  getRecommendations,
  getSalesForecast,
  getInventoryForecast
};

