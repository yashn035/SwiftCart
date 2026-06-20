import { useEffect, useState, useCallback } from 'react';
import {
  Package, Plus, Edit3, Trash2, TrendingUp, ShoppingBag,
  X, Check, BarChart2, RefreshCw, DollarSign, Eye, Upload
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getSellerProducts, createProduct, updateProduct, deleteProduct, bulkCreateProducts } from '../api/products';
import { getSellerOrders, getSellerAnalytics, updateOrderStatus } from '../api/orders';
import OrderStatusBadge from '../components/OrderStatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'products', label: 'My Products', icon: <Package size={16} /> },
  { id: 'orders', label: 'Incoming Orders', icon: <ShoppingBag size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
];

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];
const STATUSES = ['placed', 'packed', 'shipped', 'delivered', 'cancelled'];

const EMPTY_FORM = { name: '', description: '', price: '', category: '', stock: '', images: '' };

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState(
    product
      ? {
          ...product,
          images: product.images?.join(', ') || '',
          price: String(product.price),
          stock: String(product.stock),
          discountPercent: String(product.discountPercent || 0),
        }
      : { name: '', description: '', price: '', category: '', stock: '', images: '', discountPercent: '0' }
  );
  const [variants, setVariants] = useState(product?.variants || []);
  const [newVarSize, setNewVarSize] = useState('');
  const [newVarColor, setNewVarColor] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleAddVariant = () => {
    if (!newVarSize && !newVarColor) {
      toast.error('Add either size or color for variant');
      return;
    }
    const val = {
      size: newVarSize,
      color: newVarColor,
      price: Number(newVarPrice) || Number(form.price) || 0,
      stock: Number(newVarStock) || 0,
    };
    setVariants([...variants, val]);
    setNewVarSize('');
    setNewVarColor('');
    setNewVarPrice('');
    setNewVarStock('');
  };

  const handleRemoveVariant = (idx) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        discountPercent: Number(form.discountPercent) || 0,
        images: form.images ? form.images.split(',').map((s) => s.trim()).filter(Boolean) : [],
        variants,
      };
      if (product) {
        await updateProduct(product._id, payload);
        toast.success('Product updated!');
      } else {
        await createProduct(payload);
        toast.success('Product created!');
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{product ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'name', label: 'Product Name', placeholder: 'e.g. Sony WH-1000XM5' },
            { name: 'description', label: 'Description', placeholder: 'Describe your product...' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-300 mb-2">{f.label}</label>
              {f.name === 'description' ? (
                <textarea name={f.name} value={form[f.name]} onChange={handleChange}
                  className="input-field resize-none h-24" placeholder={f.placeholder} required />
              ) : (
                <input name={f.name} value={form[f.name]} onChange={handleChange}
                  className="input-field" placeholder={f.placeholder} required />
              )}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Price (₹)</label>
              <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange}
                className="input-field" placeholder="999" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Stock</label>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange}
                className="input-field" placeholder="50" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Discount (%)</label>
              <input name="discountPercent" type="number" min="0" max="100" value={form.discountPercent} onChange={handleChange}
                className="input-field" placeholder="0" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select name="category" value={form.category} onChange={handleChange}
              className="input-field" required>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image URLs <span className="text-gray-500 font-normal">(comma-separated)</span>
            </label>
            <input name="images" value={form.images} onChange={handleChange}
              className="input-field" placeholder="https://example.com/img.jpg, ..." />
          </div>

          {/* Variants Management */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-bold text-white mb-3">Product Variants</h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <input type="text" value={newVarSize} onChange={(e) => setNewVarSize(e.target.value)} placeholder="Size" className="input-field py-1 text-xs" />
              <input type="text" value={newVarColor} onChange={(e) => setNewVarColor(e.target.value)} placeholder="Color" className="input-field py-1 text-xs" />
              <input type="number" value={newVarPrice} onChange={(e) => setNewVarPrice(e.target.value)} placeholder="Price Override" className="input-field py-1 text-xs" />
              <input type="number" value={newVarStock} onChange={(e) => setNewVarStock(e.target.value)} placeholder="Stock" className="input-field py-1 text-xs" />
            </div>
            <button type="button" onClick={handleAddVariant} className="btn-secondary w-full py-1 text-xs mb-3">
              Add Variant
            </button>
            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs bg-white/5 p-2 rounded-lg">
                  <span className="text-gray-300">
                    {v.size && `Size: ${v.size}`} {v.color && `Color: ${v.color}`} — ₹{v.price} ({v.stock} left)
                  </span>
                  <button type="button" onClick={() => handleRemoveVariant(idx)} className="text-red-400 hover:text-red-300">Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
              {product ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-xl p-3 border border-white/10 text-sm">
        <p className="text-gray-400 mb-2">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.dataKey === 'revenue' ? `₹${p.value.toLocaleString('en-IN')}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  };

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one product row.');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  const nameIdx = headers.indexOf('name');
  const descIdx = headers.indexOf('description');
  const priceIdx = headers.indexOf('price');
  const catIdx = headers.indexOf('category');
  const stockIdx = headers.indexOf('stock');
  const imagesIdx = headers.indexOf('images');
  
  if (nameIdx === -1 || descIdx === -1 || priceIdx === -1 || catIdx === -1) {
    throw new Error('CSV headers must include name, description, price, and category.');
  }

  const results = [];
  
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < Math.max(nameIdx, descIdx, priceIdx, catIdx) + 1) continue;

    const name = values[nameIdx];
    const description = values[descIdx];
    const priceStr = values[priceIdx];
    const category = values[catIdx];

    if (!name || !description || !priceStr || !category) continue;

    results.push({
      name,
      description,
      price: Number(priceStr) || 0,
      category,
      stock: stockIdx !== -1 ? Number(values[stockIdx]) || 0 : 0,
      images: imagesIdx !== -1 && values[imagesIdx] ? values[imagesIdx].split(';').map(x => x.trim()).filter(Boolean) : [],
    });
  }
  return results;
};

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalProduct, setModalProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, oRes, aRes] = await Promise.all([
        getSellerProducts(),
        getSellerOrders(),
        getSellerAnalytics(),
      ]);
      setProducts(pRes.data);
      setOrders(oRes.data);
      setAnalytics(aRes.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result;
      if (typeof text !== 'string') return;
      
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          toast.error('No valid products found in CSV');
          return;
        }

        const loadToast = toast.loading(`Uploading ${parsed.length} products...`);
        try {
          await bulkCreateProducts(parsed);
          toast.success(`Successfully uploaded ${parsed.length} products!`, { id: loadToast });
          fetchAll();
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to bulk upload products', { id: loadToast });
        }
      } catch (err) {
        toast.error(err.message || 'Error parsing CSV file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  useEffect(() => { fetchAll(); }, []);

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      setProducts((p) => p.filter((x) => x._id !== id));
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, orderStatus: status } : o));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const totalRevenue = analytics.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = analytics.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Seller Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your products and orders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Products', value: products.length, icon: <Package size={20} />, color: 'text-primary-400' },
            { label: 'Total Orders', value: orders.length, icon: <ShoppingBag size={20} />, color: 'text-cyan-400' },
            { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: <DollarSign size={20} />, color: 'text-emerald-400' },
            { label: 'Days Active', value: analytics.length, icon: <TrendingUp size={20} />, color: 'text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-5">
              <div className={`${stat.color} mb-3`}>{stat.icon}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`seller-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-glow-sm'
                  : 'glass text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <button onClick={fetchAll} className="ml-auto p-2.5 glass rounded-xl text-gray-400 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="xl" /></div>
        ) : (
          <>
            {/* PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-end items-center gap-3 mb-4">
                  <label className="btn-secondary flex items-center gap-2 cursor-pointer py-2.5 px-4 text-sm font-medium">
                    <Upload size={16} />
                    <span>Upload CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    id="add-product-btn"
                    onClick={() => { setModalProduct(null); setShowModal(true); }}
                    className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm font-medium"
                  >
                    <Plus size={16} /> Add Product
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="card text-center py-16">
                    <Package size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-4">No products yet. Create your first listing or upload a CSV!</p>
                    <div className="flex justify-center gap-3">
                      <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                        <Upload size={16} />
                        <span>Upload CSV</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvUpload}
                          className="hidden"
                        />
                      </label>
                      <button onClick={() => { setModalProduct(null); setShowModal(true); }} className="btn-primary">
                        <Plus size={16} className="inline mr-2" />Add Product
                      </button>
                    </div>
                  </div>

                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((p) => (
                      <div key={p._id} className="glass-hover rounded-2xl overflow-hidden">
                        <div className="aspect-video overflow-hidden bg-surface-light">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={32} className="text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-100 text-sm leading-snug flex-1 mr-2 line-clamp-2">{p.name}</h3>
                            <span className="badge-purple badge text-[10px] flex-shrink-0">{p.category}</span>
                          </div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-primary-400 font-bold">₹{p.price.toLocaleString('en-IN')}</span>
                            <span className={`text-xs ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-amber-400' : 'text-gray-400'}`}>
                              {p.stock} in stock
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              id={`edit-product-${p._id}`}
                              onClick={() => { setModalProduct(p); setShowModal(true); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium glass rounded-lg hover:border-primary-500/40 hover:text-primary-300 transition-all"
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                            <button
                              id={`delete-product-${p._id}`}
                              onClick={() => handleDeleteProduct(p._id, p.name)}
                              className="flex-1 btn-danger flex items-center justify-center gap-1.5 py-2 text-xs"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <div className="card text-center py-16">
                    <ShoppingBag size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No orders yet.</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order._id} id={`seller-order-${order._id}`} className="card">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Order from</p>
                          <p className="font-semibold text-white">{order.buyerId?.name}</p>
                          <p className="text-xs text-gray-500">{order.buyerId?.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <OrderStatusBadge status={order.paymentStatus} />
                          <OrderStatusBadge status={order.orderStatus} />
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2 mb-4 pb-4 border-b border-white/5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-300">{item.productId?.name} × {item.quantity}</span>
                            <span className="text-gray-200 font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xl font-black gradient-text">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                        {order.paymentStatus === 'paid' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Update status:</span>
                            <select
                              id={`status-select-${order._id}`}
                              value={order.orderStatus}
                              onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                              className="input-field py-1.5 text-sm w-auto"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {analytics.length === 0 ? (
                  <div className="card text-center py-16">
                    <BarChart2 size={48} className="mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">No analytics data yet. Complete some orders to see charts.</p>
                  </div>
                ) : (
                  <>
                    {/* Revenue Chart */}
                    <div className="card">
                      <h3 className="font-bold text-white mb-6">Revenue Over Time (₹)</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={analytics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line
                            type="monotone" dataKey="revenue" name="Revenue"
                            stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Orders Chart */}
                    <div className="card">
                      <h3 className="font-bold text-white mb-6">Orders Per Day</h3>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={analytics} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="orders" name="Orders" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={modalProduct}
          onClose={() => setShowModal(false)}
          onSave={fetchAll}
        />
      )}
    </div>
  );
}
