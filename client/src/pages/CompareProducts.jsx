import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Sparkles, Scale } from 'lucide-react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function CompareProducts() {
  const [productsList, setProductsList] = useState([]);
  const [comparedProducts, setComparedProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products')
      .then((res) => {
        setProductsList(res.data.products || res.data);
      })
      .catch(() => {
        toast.error('Failed to load products list for comparison');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    if (comparedProducts.find((p) => p._id === selectedProductId)) {
      toast.error('Product is already in the comparison list!');
      return;
    }
    if (comparedProducts.length >= 3) {
      toast.error('You can compare a maximum of 3 products at a time.');
      return;
    }

    const prod = productsList.find((p) => p._id === selectedProductId);
    if (prod) {
      setComparedProducts([...comparedProducts, prod]);
      setSelectedProductId('');
    }
  };

  const handleRemoveProduct = (id) => {
    setComparedProducts(comparedProducts.filter((p) => p._id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center text-primary-400">
            <Scale size={20} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">Compare Products</h1>
            <p className="text-gray-400 text-sm">Compare features, specifications, and prices side-by-side</p>
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="card max-w-xl mb-8 flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">Select Product to Add</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input-field py-2 text-sm"
            >
              <option value="">Choose a product...</option>
              {productsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} — ₹{p.price.toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddProduct}
            className="btn-primary py-2 text-sm w-full sm:w-auto flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Add to Compare
          </button>
        </div>

        {/* Comparison Matrix */}
        {comparedProducts.length === 0 ? (
          <div className="card text-center py-24">
            <Scale size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No products selected</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Choose products from the list above and click "Add to Compare" to see details compared side-by-side.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 border border-white/10 rounded-2xl overflow-hidden glass divide-y md:divide-y-0 md:divide-x divide-white/10">
            {/* Headers Column */}
            <div className="hidden md:flex flex-col bg-white/2">
              <div className="h-44 p-4 border-b border-white/10 flex items-center font-bold text-white text-base">Comparison Summary</div>
              <div className="p-4 py-6 border-b border-white/10 font-bold text-gray-400 text-sm">Price</div>
              <div className="p-4 py-6 border-b border-white/10 font-bold text-gray-400 text-sm">Category</div>
              <div className="p-4 py-6 border-b border-white/10 font-bold text-gray-400 text-sm">Stock Availability</div>
              <div className="p-4 py-6 font-bold text-gray-400 text-sm">Description</div>
            </div>

            {/* Compared Products Columns */}
            {comparedProducts.map((p) => (
              <div key={p._id} className="flex flex-col relative group">
                <button
                  onClick={() => handleRemoveProduct(p._id)}
                  className="absolute top-3 right-3 p-1.5 bg-red-600/10 text-red-400 hover:text-red-300 hover:bg-red-600/30 rounded-lg transition-colors z-20"
                >
                  <Trash2 size={14} />
                </button>

                {/* Info Header */}
                <div className="h-44 p-4 border-b border-white/10 flex flex-col justify-end">
                  <div className="w-16 h-16 rounded-lg bg-surface-light border border-white/10 overflow-hidden mb-2">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-[10px]">No Img</div>
                    )}
                  </div>
                  <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">{p.name}</h3>
                </div>

                {/* Price */}
                <div className="p-4 py-6 border-b border-white/10 flex justify-between md:block">
                  <span className="md:hidden font-bold text-gray-500 text-xs mr-2">Price:</span>
                  <span className="text-primary-400 font-bold text-base">₹{p.price.toLocaleString('en-IN')}</span>
                </div>

                {/* Category */}
                <div className="p-4 py-6 border-b border-white/10 flex justify-between md:block">
                  <span className="md:hidden font-bold text-gray-500 text-xs mr-2">Category:</span>
                  <span className="badge-purple badge text-[10px]">{p.category}</span>
                </div>

                {/* Stock */}
                <div className="p-4 py-6 border-b border-white/10 flex justify-between md:block">
                  <span className="md:hidden font-bold text-gray-500 text-xs mr-2">Stock:</span>
                  <span className={`text-xs ${p.stock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.stock > 0 ? `${p.stock} Available` : 'Out of Stock'}
                  </span>
                </div>

                {/* Description */}
                <div className="p-4 py-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="md:hidden font-bold text-gray-500 text-xs block mb-1">Description:</span>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-6">{p.description}</p>
                  </div>
                  <Link
                    to={`/products/${p._id}`}
                    className="btn-primary py-2 text-xs text-center w-full mt-6 block"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}

            {/* Empty Columns Filler */}
            {Array.from({ length: Math.max(0, 3 - comparedProducts.length) }).map((_, idx) => (
              <div key={idx} className="hidden md:flex flex-col items-center justify-center py-20 text-gray-600 bg-white/[0.01]">
                <Scale size={24} className="opacity-20 mb-2" />
                <span className="text-xs font-semibold">Select product</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
