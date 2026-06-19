import { useEffect, useState, useCallback } from 'react';
import { Package, RefreshCw, Radio } from 'lucide-react';
import { getMyOrders } from '../api/orders';
import OrderStatusBadge from '../components/OrderStatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['placed', 'packed', 'shipped', 'delivered'];

function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-0 mt-4">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className={`relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-500 ${
              done
                ? active
                  ? 'border-primary-500 bg-primary-600 text-white shadow-glow-sm'
                  : 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-white/20 bg-surface text-gray-600'
            }`}>
              {done && !active ? '✓' : i + 1}
              {active && (
                <span className="absolute inset-0 rounded-full bg-primary-500/30 animate-ping" />
              )}
            </div>
            <div className={`hidden sm:block text-[10px] absolute mt-10 ml-[-10px] whitespace-nowrap font-medium capitalize ${
              done ? active ? 'text-primary-300' : 'text-emerald-400' : 'text-gray-600'
            }`}>
              {step}
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-[2px] mx-1 transition-all duration-700 rounded ${
                i < currentIdx ? 'bg-emerald-500' : 'bg-white/10'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getMyOrders();
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Socket.io — live order updates
  const handleSocketUpdate = useCallback(({ orderId, status }) => {
    setOrders((prev) =>
      prev.map((order) =>
        order._id === orderId ? { ...order, orderStatus: status } : order
      )
    );
    toast.success(`Order status updated to: ${status.toUpperCase()}`, {
      icon: '📦',
      duration: 5000,
    });
  }, []);

  useSocket(handleSocketUpdate);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="card max-w-sm text-center">
          <Package size={64} className="mx-auto text-gray-600 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">No orders yet</h2>
          <p className="text-gray-400 mb-8">Your order history will appear here.</p>
          <a href="/products" className="btn-primary inline-flex items-center gap-2">Start Shopping</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Orders</h1>
            <p className="text-gray-400 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 glass rounded-lg border border-emerald-600/30 text-xs text-emerald-400">
              <Radio size={12} className="animate-pulse" />
              Live Updates Active
            </div>
            <button
              onClick={fetchOrders}
              className="p-2 glass rounded-lg hover:border-primary-500/40 transition-colors text-gray-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} id={`order-${order._id}`} className="card animate-fade-in">
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Order ID</p>
                  <p className="font-mono text-xs text-gray-300">{order._id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.paymentStatus} pulse={order.paymentStatus === 'pending'} />
                  <OrderStatusBadge status={order.orderStatus} pulse={order.orderStatus === 'shipped'} />
                </div>
              </div>

              {/* Status Timeline (only for paid orders) */}
              {order.paymentStatus === 'paid' && order.orderStatus !== 'cancelled' && (
                <div className="mb-6 pb-6 border-b border-white/5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Delivery Progress
                  </p>
                  <StatusTimeline currentStatus={order.orderStatus} />
                </div>
              )}

              {/* Items */}
              <div className="space-y-3 mb-5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-surface-light">
                      {item.productId?.images?.[0] && (
                        <img src={item.productId.images[0]} alt="" className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display='none'; }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {item.productId?.name || 'Product'}
                      </p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.price?.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="font-semibold text-gray-200 flex-shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <span className="text-xl font-black gradient-text">
                  ₹{order.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
