import { useEffect, useState, useRef } from 'react';
import { HelpCircle, MessageSquare, Plus, CheckCircle, Send, Loader, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const FAQS = [
  { q: 'How do I track my order?', a: 'Once an order is paid, you can view its tracking progress inside your "My Orders" tab. Sellers will update statuses from packed to shipped and delivered in real-time!' },
  { q: 'What is the refund policy?', a: 'If you receive a damaged or incorrect product, you can initiate a return request from the order details inside your "My Orders" tab. Once approved by the administrator, a refund will be issued.' },
  { q: 'How do I earn reward points?', a: 'You automatically earn SwiftCart reward points for every purchase you make. Higher tier members (Bronze, Silver, Gold, Platinum) earn multiplier bonuses and enjoy free shipping!' },
];

export default function SupportCenter() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newSubject, setNewSubject] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const messagesEndRef = useRef(null);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets');
      setTickets(res.data);
      if (selectedTicket) {
        const updated = res.data.find((t) => t._id === selectedTicket._id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/tickets', { subject: newSubject, message: newMsg });
      setTickets((prev) => [res.data, ...prev]);
      setNewSubject('');
      setNewMsg('');
      setShowCreateModal(false);
      setSelectedTicket(res.data);
      toast.success('Support ticket opened!');
    } catch (err) {
      toast.error('Failed to open support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyMsg.trim()) return;

    try {
      const res = await api.post(`/tickets/${selectedTicket._id}/message`, { text: replyMsg });
      setSelectedTicket(res.data);
      setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
      setReplyMsg('');
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const handleResolveTicket = async () => {
    try {
      const res = await api.patch(`/tickets/${selectedTicket._id}/status`, { status: 'resolved' });
      setSelectedTicket(res.data);
      setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
      toast.success('Ticket marked as resolved!');
    } catch (err) {
      toast.error('Failed to update ticket status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-primary-400">
            <HelpCircle size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Support Center</h1>
            <p className="text-gray-400 text-sm">How can we help you today?</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left panel: FAQS & Create ticket */}
          <div className="space-y-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Open New Support Ticket
            </button>

            {/* FAQs Accordion */}
            <div className="card space-y-4">
              <h2 className="font-bold text-white text-base flex items-center gap-2 mb-4">
                <HelpCircle size={18} className="text-primary-400" /> Frequently Asked Questions
              </h2>
              {FAQS.map((faq, idx) => (
                <div key={idx} className="space-y-1.5 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <h3 className="text-sm font-semibold text-gray-200">{faq.q}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Tickets board */}
          <div className="lg:col-span-2 grid md:grid-cols-2 gap-6 h-[600px]">
            {/* Tickets list */}
            <div className="card flex flex-col h-full overflow-hidden p-0">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/2">
                <h3 className="font-bold text-white text-sm">Your Tickets</h3>
                <span className="text-xs text-gray-500">{tickets.length} total</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {tickets.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 text-sm">
                    No active support tickets.
                  </div>
                ) : (
                  tickets.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full p-4 text-left flex justify-between items-start gap-4 transition-colors hover:bg-white/5 ${
                        selectedTicket?._id === t._id ? 'bg-primary-600/10' : ''
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-semibold text-white truncate">{t.subject}</h4>
                        <span className="text-[10px] text-gray-500 block">
                          Last active: {new Date(t.updatedAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <span
                        className={`badge text-[10px] uppercase ${
                          t.status === 'resolved'
                            ? 'badge-green'
                            : t.status === 'in-progress'
                            ? 'badge-yellow'
                            : 'badge-blue'
                        }`}
                      >
                        {t.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Ticket chat view */}
            <div className="card flex flex-col h-full overflow-hidden p-0">
              {selectedTicket ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/2">
                    <div>
                      <h3 className="font-bold text-white text-sm truncate max-w-[200px]">{selectedTicket.subject}</h3>
                      <span className="text-[10px] text-gray-500">ID: {selectedTicket._id}</span>
                    </div>
                    {selectedTicket.status !== 'resolved' && (
                      <button
                        onClick={handleResolveTicket}
                        className="p-1 px-3 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 hover:text-emerald-300 border border-emerald-600/30 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle size={10} /> Resolve
                      </button>
                    )}
                  </div>

                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedTicket.messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex ${m.senderId === user._id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            m.senderId === user._id
                              ? 'bg-primary-600 text-white rounded-tr-none'
                              : 'bg-white/5 text-gray-200 border border-white/5 rounded-tl-none'
                          }`}
                        >
                          <div className="font-bold text-[10px] mb-1 text-primary-300">
                            {m.senderName}
                          </div>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Input Form */}
                  {selectedTicket.status !== 'resolved' ? (
                    <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 flex gap-2">
                      <input
                        type="text"
                        value={replyMsg}
                        onChange={(e) => setReplyMsg(e.target.value)}
                        placeholder="Write your message..."
                        className="input-field py-2 text-xs flex-1"
                        required
                      />
                      <button
                        type="submit"
                        className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-white/2 border-t border-white/5 text-center text-xs text-gray-500">
                      This ticket is resolved. Open a new ticket if you need further help.
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <MessageSquare size={36} className="text-gray-600 mb-2" />
                  <h3 className="font-semibold text-gray-400 text-sm">Select a Ticket</h3>
                  <p className="text-xs text-gray-600 max-w-[200px] mt-1">
                    Click a ticket on the left to view details and message support.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-bold text-white mb-4">Open a New Support Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Shipping Delay, Damaged Product..."
                  className="input-field py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Message</label>
                <textarea
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="input-field resize-none h-28 text-sm"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center"
                >
                  {submitting ? <Loader size={14} className="animate-spin" /> : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
