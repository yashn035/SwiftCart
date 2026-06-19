import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (user?.role === 'seller' || user?.role === 'admin') {
      toast.error('Only buyers can add items to cart');
      return;
    }
    addToCart(product);
    toast.success(`${product.name} added to cart!`);
  };

  const isOutOfStock = product.stock === 0;

  return (
    <Link
      to={`/products/${product._id}`}
      id={`product-card-${product._id}`}
      className="group block glass-hover rounded-2xl overflow-hidden"
    >
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-surface-light">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=400&background=7c3aed&color=fff`;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-lighter">
            <Package size={48} className="text-gray-600" />
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isOutOfStock && (
            <span className="badge bg-red-900/80 text-red-300 backdrop-blur-sm text-[10px]">
              Out of Stock
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="badge bg-amber-900/80 text-amber-300 backdrop-blur-sm text-[10px]">
              Only {product.stock} left
            </span>
          )}
        </div>

        {/* Category badge */}
        <div className="absolute top-3 right-3">
          <span className="badge bg-black/60 text-gray-300 backdrop-blur-sm text-[10px]">
            {product.category}
          </span>
        </div>

        {/* Add to cart overlay */}
        {!isOutOfStock && (!user || user.role === 'buyer') && (
          <button
            id={`add-to-cart-${product._id}`}
            onClick={handleAddToCart}
            className="absolute bottom-3 left-3 right-3 py-2 bg-primary-600/90 hover:bg-primary-500 backdrop-blur-sm text-white text-sm font-semibold rounded-lg
                       opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0
                       transition-all duration-300 flex items-center justify-center gap-2"
          >
            <ShoppingCart size={14} />
            Add to Cart
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 inline-block" />
          {product.sellerId?.name || 'SwiftCart Seller'}
        </p>
        <h3 className="font-semibold text-gray-100 mb-2 line-clamp-2 group-hover:text-primary-300 transition-colors leading-snug">
          {product.name}
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold gradient-text">
              ₹{product.price.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <Star size={12} fill="currentColor" />
            <span className="text-xs text-gray-400">4.{Math.floor(Math.random() * 5) + 1}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
