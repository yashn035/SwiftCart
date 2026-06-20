const router = require('express').Router();
const {
  chatWithAssistant,
  getRecommendations,
  getSalesForecast,
  getInventoryForecast
} = require('../controllers/ai.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.post('/chat', protect, chatWithAssistant);
router.get('/recommendations', protect, getRecommendations);
router.get('/forecast/sales', protect, requireRole('seller'), getSalesForecast);
router.get('/forecast/inventory', protect, requireRole('seller'), getInventoryForecast);

module.exports = router;
