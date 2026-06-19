import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Lock, CheckCircle, ArrowLeft, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, verifyPayment } from '../api/orders';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('review'); // review | processing | success

  const handlePayment = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Step 1: Create order on backend (also creates Razorpay order)
      const orderRes = await createOrder(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
      );

      const { orderId, razorpayOrderId, amount, currency, keyId, devMode } = orderRes.data;

      // ── DEV MODE: no real Razorpay keys → auto-verify and skip modal ────────
      if (devMode || keyId === 'DEV_MODE') {
        try {
          await verifyPayment({ razorpayOrderId, razorpayPaymentId: null, razorpaySignature: null, orderId });
          clearCart();
          setStep('success');
          toast.success('Order placed! (Demo mode — add Razorpay keys for live payments)');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Order failed');
          setStep('review');
        }
        setLoading(false);
        return;
      }

      // ── PRODUCTION: open real Razorpay checkout modal ────────────────────────
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'SwiftCart',
        description: `Order #${orderId}`,
        image: 'https://ui-avatars.com/api/?name=SC&background=7c3aed&color=fff&size=64',
        order_id: razorpayOrderId,
        prefill: { name: user.name, email: user.email },
        theme: { color: '#7c3aed', backdrop_color: 'rgba(10, 10, 20, 0.85)' },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: '⚠️' });
            setLoading(false);
            setStep('review');
          },
        },
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderId,
            });
            clearCart();
            setStep('success');
            toast.success('Payment successful! Order placed 🎉');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed');
            setStep('review');
            setLoading(false);
          }
        },
      };

      if (!window.Razorpay) {
        toast.error('Razorpay not loaded. Check your internet connection.');
        setLoading(false);
        setStep('review');
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
      setStep('review');
    }
  };

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="card max-w-md text-center animate-slide-up">
          <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Order Placed! 🎉</h1>
          <p className="text-gray-400 mb-8">
            Your payment was successful. Track your order status in real-time from My Orders.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate('/orders')} className="btn-primary flex-1">
              Track Order
            </button>
            <button onClick={() => navigate('/products')} className="btn-secondary flex-1">
              Shop More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to cart
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Order Review */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card">
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-primary-400" />
                Order Review
              </h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-4 py-3 border-b border-white/5 last:border-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-light">
                      {item.image && (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=7c3aed&color=fff`; }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-200 text-sm leading-snug truncate">{item.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-white flex-shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="card">
              <h2 className="font-bold text-white mb-4">Account Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20">Name:</span>
                  <span className="text-gray-100 font-medium">{user?.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20">Email:</span>
                  <span className="text-gray-100">{user?.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24">
              <h2 className="font-bold text-white mb-6">Payment Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal ({items.length} items)</span>
                  <span className="text-gray-200">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery</span>
                  <span className="text-emerald-400 font-medium">FREE</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-200">Total</span>
                  <span className="text-2xl font-black gradient-text">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Security badges */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 p-3 bg-emerald-600/5 rounded-xl border border-emerald-600/15">
                <Lock size={12} className="text-emerald-400 flex-shrink-0" />
                Secured by Razorpay · HMAC-SHA256 verified
              </div>

              <button
                id="pay-now-btn"
                onClick={handlePayment}
                disabled={loading || step === 'processing'}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Pay ₹{total.toLocaleString('en-IN')}
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-500 mt-4">
                By paying, you agree to our Terms of Service.
                Payment is processed in sandbox/test mode.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
