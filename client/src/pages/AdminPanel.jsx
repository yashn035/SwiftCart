import { useEffect, useState, useCallback } from 'react';
import { Trash2, Package, Users, RefreshCw, Shield, Eye } from 'lucide-react';
import { getAdminProducts, deleteAdminProduct, getAdminUsers, deleteAdminUser } from '../api/admin';
import OrderStatusBadge from '../components/OrderStatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'products', label: 'All Products', icon: <Package size={16} /> },
  { id: 'users', label: 'Users', icon: <Users size={16} /> },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, uRes] = await Promise.all([getAdminProducts(), getAdminUsers()]);
      setProducts(pRes.data);
      setUsers(uRes.data);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAdminProduct(id);
      toast.success('Product deleted');
      setProducts((p) => p.filter((x) => x._id !== id));
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(id);
      toast.success('User deleted');
      setUsers((u) => u.filter((x) => x._id !== id));
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const sellers = users.filter((u) => u.role === 'seller').length;
  const buyers = users.filter((u) => u.role === 'buyer').length;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center">
            <Shield size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-0.5">Full platform oversight</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Products', value: products.length, color: 'text-primary-400' },
            { label: 'Total Users', value: users.length, color: 'text-cyan-400' },
            { label: 'Sellers', value: sellers, color: 'text-amber-400' },
            { label: 'Buyers', value: buyers, color: 'text-emerald-400' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-5">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-red-600/20 border border-red-600/30 text-red-300'
                  : 'glass text-gray-400 hover:text-white'
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
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['Product', 'Category', 'Seller', 'Price', 'Stock', 'Actions'].map((h) => (
                          <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => (
                        <tr key={p._id} id={`admin-product-${p._id}`} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-surface-light">
                                {p.images?.[0] && (
                                  <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <span className="text-sm font-medium text-gray-200 max-w-[200px] truncate">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="badge-purple badge text-[10px]">{p.category}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">{p.sellerId?.name || '—'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-primary-400">₹{p.price.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{p.stock}</td>
                          <td className="px-6 py-4">
                            <button
                              id={`admin-del-product-${p._id}`}
                              onClick={() => handleDeleteProduct(p._id, p.name)}
                              className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {products.length === 0 && (
                    <div className="text-center py-16 text-gray-500">No products found.</div>
                  )}
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        {['User', 'Email', 'Role', 'Joined', 'Actions'].map((h) => (
                          <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u._id} id={`admin-user-${u._id}`} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                                {u.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-200">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`badge text-[10px] ${
                              u.role === 'admin' ? 'badge-red' : u.role === 'seller' ? 'badge-yellow' : 'badge-blue'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4">
                            {u.role !== 'admin' && (
                              <button
                                id={`admin-del-user-${u._id}`}
                                onClick={() => handleDeleteUser(u._id, u.name)}
                                className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="text-center py-16 text-gray-500">No users found.</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
