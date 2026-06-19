import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Package, Star, Minus, Plus, CheckCircle } from 'lucide-react';
import { getProduct } from '../api/products';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImg, setSelectedImg] = useState(0);

  useEffect(() => {
    getProduct(id)
      .then((res) => setProduct(res.data))
      .catch(() => navigate('/products'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!product) return null;

  const inCart = items.find((i) => i.productId === product._id);
  const isOutOfStock = product.stock === 0;
  const canBuy = !user || user.role === 'buyer';

  const handleAddToCart = () => {
    if (!canBuy) { toast.error('Only buyers can add to cart'); return; }
    addToCart(product, quantity);
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!canBuy) { toast.error('Only buyers can purchase'); return; }
    if (!user) { navigate('/login'); return; }
    addToCart(product, quantity);
    navigate('/cart');
  };

  const images = product.images?.length > 0
    ? product.images
    : [`https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=600&background=7c3aed&color=fff`];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to products
        </button>

        <div className="grid lg:grid-cols-2 gap-12 animate-fade-in">
          {/* Left — Images */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden glass mb-4">
              <img
                src={images[selectedImg]}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=600&background=7c3aed&color=fff`;
                }}
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImg(i)}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImg === i ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — Info */}
          <div className="flex flex-col">
            {/* Category + Seller */}
            <div className="flex items-center gap-3 mb-4">
              <span className="badge-purple badge">{product.category}</span>
              <span className="text-gray-500 text-sm">
                by <span className="text-gray-300">{product.sellerId?.name || 'SwiftCart Seller'}</span>
              </span>
            </div>

            <h1 className="text-3xl font-bold text-white mb-4 leading-tight">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < 4 ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className="text-gray-400 text-sm">(128 reviews)</span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <span className="text-4xl font-black gradient-text">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              <span className="text-gray-500 text-sm ml-2">incl. all taxes</span>
            </div>

            {/* Description */}
            <p className="text-gray-300 leading-relaxed mb-8 text-[15px]">{product.description}</p>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              {isOutOfStock ? (
                <span className="badge badge-red gap-2"><X size={12} /> Out of Stock</span>
              ) : (
                <span className="badge badge-green gap-2">
                  <CheckCircle size={12} />
                  {product.stock <= 10 ? `Only ${product.stock} left` : 'In Stock'}
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && canBuy && (
              <div className="flex items-center gap-4 mb-8">
                <span className="text-sm text-gray-400 font-medium">Quantity:</span>
                <div className="flex items-center glass rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-3 hover:bg-white/5 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-5 py-3 font-bold text-white min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="p-3 hover:bg-white/5 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {canBuy && !isOutOfStock ? (
              <div className="flex gap-4">
                <button
                  id="add-to-cart-detail"
                  onClick={handleAddToCart}
                  className="btn-secondary flex items-center gap-2 flex-1 justify-center"
                >
                  <ShoppingCart size={18} />
                  {inCart ? 'Add More' : 'Add to Cart'}
                </button>
                <button
                  id="buy-now-btn"
                  onClick={handleBuyNow}
                  className="btn-primary flex items-center gap-2 flex-1 justify-center"
                >
                  Buy Now
                </button>
              </div>
            ) : isOutOfStock ? (
              <div className="w-full py-4 glass rounded-xl text-center text-gray-500 font-medium border border-red-600/20">
                Currently Unavailable
              </div>
            ) : null}

            {inCart && (
              <p className="mt-3 text-sm text-primary-400 flex items-center gap-1">
                <CheckCircle size={14} />
                {inCart.quantity} already in your cart
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
