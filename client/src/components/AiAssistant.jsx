import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AiAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name || 'there'}! I'm your SwiftCart AI assistant. How can I help you find products, track orders, or manage checkout today? ✨`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!user) return null; // Only show for logged in users

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message;
    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/ai/chat', { message: userMessage, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center shadow-glow hover:shadow-glow-lg transition-all duration-300 hover:scale-105 active:scale-95 animate-bounce-slow"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[500px] glass rounded-2xl border border-white/10 shadow-card flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="p-4 bg-primary-600/20 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">AI Shopping Assistant</h3>
                <span className="text-[10px] text-primary-300 font-medium">Powered by OpenAI</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed whitespace-pre-line ${
                    m.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-none'
                      : 'bg-white/5 text-gray-200 border border-white/5 rounded-tl-none'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 text-gray-400 border border-white/5 rounded-2xl rounded-tl-none p-3 flex items-center gap-2">
                  <Loader size={14} className="animate-spin text-primary-400" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask anything (e.g. Find headphones...)"
              className="input-field py-2 text-sm flex-1"
              disabled={loading}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="p-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl transition-all duration-200"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
