import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, total, itemCount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center card max-w-sm">
          <ShoppingCart size={64} className="mx-auto text-gray-600 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Your cart is empty</h2>
          <p className="text-gray-400 mb-8">Looks like you haven't added anything yet.</p>
          <Link to="/products" className="btn-primary inline-flex items-center gap-2">
            <ShoppingBag size={16} />
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
            <p className="text-gray-400 text-sm mt-1">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={clearCart}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} /> Clear all
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.productId} id={`cart-item-${item.productId}`} className="glass rounded-2xl p-5 flex gap-4 animate-fade-in">
                {/* Image */}
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-surface-light">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&size=96&background=7c3aed&color=fff`; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-lighter" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.productId}`} className="font-semibold text-gray-100 hover:text-primary-300 transition-colors line-clamp-2 leading-snug">
                    {item.name}
                  </Link>
                  <p className="text-primary-400 font-bold text-lg mt-1">
                    ₹{item.price.toLocaleString('en-IN')}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Subtotal: ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Qty + Remove */}
                <div className="flex flex-col items-end justify-between flex-shrink-0">
                  <button
                    id={`remove-${item.productId}`}
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-all"
                  >
                    <Trash2 size={15} />
                  </button>

                  <div className="flex items-center glass rounded-lg overflow-hidden">
                    <button
                      id={`qty-minus-${item.productId}`}
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-2 hover:bg-white/5 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-3 text-sm font-bold text-white">{item.quantity}</span>
                    <button
                      id={`qty-plus-${item.productId}`}
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-2 hover:bg-white/5 transition-colors disabled:opacity-30"
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <h3 className="text-lg font-bold text-white mb-6">Order Summary</h3>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-400 truncate mr-2">{item.name} × {item.quantity}</span>
                    <span className="text-gray-200 flex-shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-300">Total</span>
                  <span className="text-2xl font-black gradient-text">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>
              </div>

              <button
                id="checkout-btn"
                onClick={handleCheckout}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>

              <Link
                to="/products"
                className="block text-center text-sm text-gray-400 hover:text-primary-400 mt-4 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
