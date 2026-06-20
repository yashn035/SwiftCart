import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Users, Store, MessageSquare, Plus, ShoppingBag } from 'lucide-react';
import api from '../api/axios';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function StorePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Review Form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchStoreAndProducts = async () => {
    try {
      const [storeRes, productsRes] = await Promise.all([
        api.get(`/stores/${id}`),
        api.get(`/products?sellerId=${id}`),
      ]);
      setStore(storeRes.data);
      setProducts(productsRes.data.products || productsRes.data);
      setIsFollowing(storeRes.data.isFollowing);
      setFollowersCount(storeRes.data.followersCount);
    } catch (err) {
      toast.error('Failed to load store profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreAndProducts();
  }, [id]);

  const handleFollowToggle = async () => {
    try {
      const res = await api.post(`/stores/${id}/follow`);
      setIsFollowing(res.data.followed);
      setFollowersCount(res.data.followersCount);
      toast.success(res.data.followed ? 'Started following store!' : 'Unfollowed store.');
    } catch (err) {
      toast.error('Failed to follow store');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await api.post(`/stores/${id}/review`, { rating, comment });
      setStore(res.data);
      setComment('');
      toast.success('Thank you for your feedback!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <Store size={48} className="text-gray-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Store Not Found</h2>
        <Link to="/" className="btn-primary text-sm">Return Home</Link>
      </div>
    );
  }

  const isOwnStore = user?._id === id;

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Banner */}
      <div className="h-48 md:h-64 w-full relative bg-gradient-to-r from-primary-800 to-indigo-900 overflow-hidden">
        {store.banner ? (
          <img src={store.banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-white/2 backdrop-blur-sm flex items-center justify-center">
            <Store size={64} className="text-white/20" />
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="glass rounded-2xl p-6 mb-8 border border-white/10 shadow-glow">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              {/* Logo */}
              <div className="w-24 h-24 rounded-2xl bg-surface-light border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
                {store.logo ? (
                  <img src={store.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store size={36} className="text-primary-400" />
                )}
              </div>

              <div>
                <h1 className="text-3xl font-black text-white mb-2">{store.name}</h1>
                <p className="text-gray-300 text-sm max-w-2xl mb-4">{store.description}</p>
                
                {/* Stats */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-white">{store.rating}</span> rating
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1.5">
                    <Users size={16} className="text-cyan-400" />
                    <span className="font-bold text-white">{followersCount}</span> followers
                  </div>
                  <span className="text-white/20">|</span>
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag size={16} className="text-primary-400" />
                    <span className="font-bold text-white">{products.length}</span> products
                  </div>
                </div>
              </div>
            </div>

            {/* Follow Action */}
            {!isOwnStore && user && (
              <button
                onClick={handleFollowToggle}
                className={`w-full md:w-auto px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
                  isFollowing
                    ? 'glass text-gray-300 border border-white/10 hover:border-red-500/40 hover:text-red-400'
                    : 'btn-primary'
                }`}
              >
                {isFollowing ? 'Following Store' : 'Follow Store'}
              </button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Products Catalog */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingBag size={20} className="text-primary-400" /> Store Catalog
            </h2>

            {products.length === 0 ? (
              <div className="card text-center py-20">
                <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">This seller has no active listings.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
            )}
          </div>

          {/* Reviews & Feedback Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare size={20} className="text-cyan-400" /> Reviews & Feedback
            </h2>

            {/* Add Review Form */}
            {user && user.role === 'buyer' && !isOwnStore && (
              <form onSubmit={handleReviewSubmit} className="card space-y-4">
                <h3 className="font-bold text-white text-sm">Write a Store Review</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={24}
                          className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Comment</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell others about your experience with this seller..."
                    className="input-field resize-none h-20 text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"
                >
                  {submittingReview ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Review'}
                </button>
              </form>
            )}

            {/* Reviews List */}
            <div className="space-y-3">
              {store.reviews.length === 0 ? (
                <div className="card text-center py-10 text-gray-500 text-sm">
                  No reviews yet. Be the first to leave feedback!
                </div>
              ) : (
                store.reviews.map((r, idx) => (
                  <div key={idx} className="glass p-4 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{r.buyerName}</span>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-white font-bold">{r.rating}</span>
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-gray-400">{r.comment}</p>}
                    <span className="text-[10px] text-gray-600 block">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
