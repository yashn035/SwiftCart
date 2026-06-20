const SupportTicket = require('../models/SupportTicket');

/**
 * GET /api/tickets
 * Get list of tickets
 */
const getTickets = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'buyer') {
      query.userId = req.user._id;
    }
    const tickets = await SupportTicket.find(query).sort({ updatedAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/tickets
 * Open a new support ticket
 */
const createTicket = async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and first message are required' });
    }

    const ticket = await SupportTicket.create({
      userId: req.user._id,
      subject,
      messages: [
        {
          senderId: req.user._id,
          senderName: req.user.name,
          text: message,
        },
      ],
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/tickets/:id
 * Retrieve a specific ticket and messages
 */
const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Users can only view their own tickets, unless they are admin/seller
    if (req.user.role === 'buyer' && ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/tickets/:id/message
 * Send a reply on a support ticket
 */
const addTicketMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Message text is required' });

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role === 'buyer' && ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    ticket.messages.push({
      senderId: req.user._id,
      senderName: req.user.name,
      text,
    });

    // Auto update status on seller/admin reply
    if (req.user.role !== 'buyer' && ticket.status === 'open') {
      ticket.status = 'in-progress';
    }

    await ticket.save();
    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH /api/tickets/:id/status
 * Resolve or close a ticket
 */
const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'in-progress', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid ticket status' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (req.user.role === 'buyer' && ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    ticket.status = status;
    await ticket.save();
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTickets, createTicket, getTicketById, addTicketMessage, updateTicketStatus };
