import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, User, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../api/axios';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedRole, setSelectedRole] = useState(user.role === 'buyer' ? 'seller' : 'buyer');
  const [targetUser, setTargetUser] = useState(null);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Define unique chat room based on role pairings
  const getRoomName = () => {
    if (user.role === 'buyer') {
      return `room_buyer_${user.id}_seller`;
    } else if (user.role === 'seller') {
      return `room_buyer_all_${selectedRole}`;
    }
    return `room_admin_support`;
  };

  const activeRoom = getRoomName();

  useEffect(() => {
    // Determine target mock user to chat with
    if (user.role === 'buyer') {
      setTargetUser({ id: '64f8fc8e3321528b18cf8ad1', name: 'Store Representative' }); // Tech Store ID seed fallback
    } else {
      setTargetUser({ id: '64f8fc8e3321528b18cf8ad2', name: 'John Buyer' }); // John Buyer ID seed fallback
    }

    // Connect socket
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit('joinRoom', activeRoom);

    // Fetch message history
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/chat/room/${activeRoom}`);
        setMessages(res.data);
      } catch (err) {
        console.warn('Failed to load chat history');
      }
    };
    fetchHistory();

    // Listen for new messages
    socketRef.current.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [activeRoom, user]);

  useEffect(() => {
    // Scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !targetUser) return;

    const data = {
      room: activeRoom,
      senderId: user.id,
      receiverId: targetUser.id,
      message: messageText
    };

    socketRef.current.emit('sendMessage', data);
    setMessageText('');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto glass rounded-2xl overflow-hidden border border-white/10 flex flex-col h-[75vh]">
        
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-600/30 flex items-center justify-center text-primary-300 font-bold">
              <User size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">{targetUser?.name || 'Support Agent'}</h2>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span> Online Support
              </p>
            </div>
          </div>
          
          {user.role === 'seller' && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRole('buyer')}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${selectedRole === 'buyer' ? 'bg-primary-600 text-white' : 'glass text-gray-400'}`}
              >
                Buyer Support
              </button>
              <button
                onClick={() => setSelectedRole('admin')}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${selectedRole === 'admin' ? 'bg-primary-600 text-white' : 'glass text-gray-400'}`}
              >
                Admin Support
              </button>
            </div>
          )}
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#07070e]">
          {messages.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              No messages yet. Send a note to start chatting!
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.senderId?._id === user.id || msg.senderId === user.id;
              return (
                <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isOwn 
                      ? 'bg-primary-600 text-white rounded-br-none shadow-glow-sm' 
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none'
                  }`}>
                    <p>{msg.message}</p>
                    <span className="text-[10px] text-white/40 block text-right mt-1.5">
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5 flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            className="input-field py-2 text-sm flex-1"
          />
          <button type="submit" className="btn-primary py-2 px-4 flex items-center justify-center">
            <Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
}
