import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Mic } from 'lucide-react';
import { getProducts } from '../api/products';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listening, setListening] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice search is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setListening(true);
      toast('Listening...', { icon: '🎙️' });
    };
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      updateFilter('search', text);
      toast.success(`Search: "${text}"`);
      setListening(false);
    };
    recognition.onerror = () => {
      toast.error('Voice recognition error.');
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.start();
  };

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    page: Number(searchParams.get('page')) || 1,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== 0)
      );
      const res = await getProducts({ ...params, limit: 12 });
      setProducts(res.data.products);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts();
    // Sync to URL
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.category) params.category = filters.category;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.page > 1) params.page = filters.page;
    setSearchParams(params);
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters((p) => ({ ...p, [key]: value, page: key !== 'page' ? 1 : value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', minPrice: '', maxPrice: '', page: 1 });
  };

  const hasActiveFilters = filters.search || filters.category || filters.minPrice || filters.maxPrice;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Browse Products</h1>
          <p className="text-gray-400 text-sm">
            {loading ? '...' : `${total} products found`}
            {hasActiveFilters && ' · Filters active'}
          </p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="product-search"
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="input-field pl-11 pr-10"
              placeholder="Search products..."
            />
            {filters.search ? (
              <button
                onClick={() => updateFilter('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoiceSearch}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${listening ? 'text-primary-400 animate-pulse' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Mic size={16} />
              </button>
            )}
          </div>
          <button
            id="filter-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${
              sidebarOpen || hasActiveFilters
                ? 'border-primary-500 bg-primary-600/15 text-primary-300'
                : 'glass text-gray-300 hover:border-white/20'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-primary-400" />
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {sidebarOpen && (
          <div className="glass rounded-2xl p-6 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <X size={14} /> Clear all
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Category</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateFilter('category', '')}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      !filters.category ? 'border-primary-500 bg-primary-600/20 text-primary-300' : 'glass text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      id={`cat-${cat.toLowerCase().replace(' ', '-')}`}
                      onClick={() => updateFilter('category', cat)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        filters.category === cat ? 'border-primary-500 bg-primary-600/20 text-primary-300' : 'glass text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Min Price (₹)</label>
                <input
                  id="min-price"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Max Price (₹)</label>
                <input
                  id="max-price"
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                  className="input-field"
                  placeholder="100000"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="xl" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 card max-w-md mx-auto">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold text-white mb-2">No products found</h3>
            <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filters.</p>
            <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-12">
                <button
                  onClick={() => updateFilter('page', filters.page - 1)}
                  disabled={filters.page <= 1}
                  className="p-2 glass rounded-lg disabled:opacity-30 hover:border-primary-500/40 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-gray-400">
                  Page <span className="text-white font-semibold">{filters.page}</span> of {pages}
                </span>
                <button
                  onClick={() => updateFilter('page', filters.page + 1)}
                  disabled={filters.page >= pages}
                  className="p-2 glass rounded-lg disabled:opacity-30 hover:border-primary-500/40 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
