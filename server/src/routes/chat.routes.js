const router = require('express').Router();
const { getRoomMessages } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/room/:room', protect, getRoomMessages);

module.exports = router;
