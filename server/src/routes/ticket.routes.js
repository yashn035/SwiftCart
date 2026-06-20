const router = require('express').Router();
const { getTickets, createTicket, getTicketById, addTicketMessage, updateTicketStatus } = require('../controllers/ticket.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', getTickets);
router.post('/', createTicket);
router.get('/:id', getTicketById);
router.post('/:id/message', addTicketMessage);
router.patch('/:id/status', updateTicketStatus);

module.exports = router;
