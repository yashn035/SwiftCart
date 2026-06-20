import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, Lock, CheckCircle, ArrowLeft, Ticket, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('review'); // review | processing | success

  // Premium Features: Coupons & Loyalty points
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountPercent, discountAmount }
  const [pointsInput, setPointsInput] = useState(0);
  const [pointsAppliedDiscount, setPointsAppliedDiscount] = useState(0);

  const subtotal = total;
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, subtotal - couponDiscount - pointsAppliedDiscount);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    try {
      const res = await api.post('/coupons/validate', {
        code: couponInput,
        orderAmount: subtotal,
      });
      setAppliedCoupon(res.data);
      toast.success(`Coupon "${res.data.code}" applied: ₹${res.data.discountAmount} off!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    }
  };

  const handleApplyPoints = (e) => {
    e.preventDefault();
    const pts = Number(pointsInput);
    if (isNaN(pts) || pts < 0) {
      toast.error('Invalid points number');
      return;
    }
    const maxUserPoints = user?.rewardPoints || 0;
    if (pts > maxUserPoints) {
      toast.error(`You only have ${maxUserPoints} points available.`);
      return;
    }
    // 1 point = ₹1, points cannot exceed subtotal after coupon discount
    const applicablePoints = Math.min(pts, subtotal - couponDiscount);
    setPointsAppliedDiscount(applicablePoints);
    toast.success(`Applied ${applicablePoints} loyalty points as ₹${applicablePoints} discount.`);
  };

  const handlePayment = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    setStep('processing');

    try {
      // Create order with coupon and points applied
      const orderRes = await api.post('/orders', {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: appliedCoupon?.code || '',
        pointsApplied: pointsAppliedDiscount,
      });

      const { orderId, razorpayOrderId, amount, currency, keyId, devMode } = orderRes.data;

      // ── DEV MODE: mock Razorpay order and verification ──────────────────────
      if (devMode || keyId === 'DEV_MODE') {
        try {
          await api.post('/orders/verify-payment', { razorpayOrderId, razorpayPaymentId: null, razorpaySignature: null, orderId });
          clearCart();
          setStep('success');
          toast.success('Order placed! (Demo mode — mock transaction complete)');
        } catch (err) {
          toast.error(err.response?.data?.message || 'Order failed');
          setStep('review');
        }
        setLoading(false);
        return;
      }

      // ── PRODUCTION: open real Razorpay modal ─────────────────────────────────
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
            await api.post('/orders/verify-payment', {
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
          {/* Order Review & Discounts */}
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

            {/* Coupons Card */}
            <div className="card">
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <Ticket size={18} className="text-yellow-400" />
                Apply Coupon
              </h2>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="ENTER CODE (e.g. FIRST20, SAVE10)"
                  className="input-field py-2 text-sm flex-1"
                />
                <button type="submit" className="btn-primary py-2 text-sm px-6">Apply</button>
              </form>
              {appliedCoupon && (
                <div className="mt-2 text-xs text-emerald-400 font-semibold">
                  Coupon applied: {appliedCoupon.discountPercent}% off (saved ₹{appliedCoupon.discountAmount})
                </div>
              )}
            </div>

            {/* Loyalty points card */}
            <div className="card">
              <h2 className="font-bold text-white mb-2 flex items-center gap-2">
                <Gift size={18} className="text-cyan-400" />
                Apply Loyalty Points
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                You have <span className="font-bold text-white">{user?.rewardPoints || 0}</span> reward points available. 1 point = ₹1 discount.
              </p>
              <form onSubmit={handleApplyPoints} className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={user?.rewardPoints || 0}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="Points to apply"
                  className="input-field py-2 text-sm flex-1"
                />
                <button type="submit" className="btn-secondary py-2 text-sm px-6">Apply Points</button>
              </form>
              {pointsAppliedDiscount > 0 && (
                <div className="mt-2 text-xs text-cyan-400 font-semibold">
                  Applied points discount: -₹{pointsAppliedDiscount}
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-2">
            <div className="card sticky top-24">
              <h2 className="font-bold text-white mb-6">Payment Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal ({items.length} items)</span>
                  <span className="text-gray-200">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Coupon Discount</span>
                    <span>-₹{couponDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {pointsAppliedDiscount > 0 && (
                  <div className="flex justify-between text-sm text-cyan-400">
                    <span>Points Rebate</span>
                    <span>-₹{pointsAppliedDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Delivery</span>
                  <span className="text-emerald-400 font-medium">FREE</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-200">Total</span>
                  <span className="text-2xl font-black gradient-text">
                    ₹{finalTotal.toLocaleString('en-IN')}
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
                    Pay ₹{finalTotal.toLocaleString('en-IN')}
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
