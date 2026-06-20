const ChatMessage = require('../models/ChatMessage');

exports.getRoomMessages = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ room: req.params.room })
      .populate('senderId', 'name')
      .populate('receiverId', 'name')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
