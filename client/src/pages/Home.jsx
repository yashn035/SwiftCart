import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, TruckIcon, Star, Package, Users, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProducts } from '../api/products';
import ProductCard from '../components/ProductCard';
import LoadingSpinner from '../components/LoadingSpinner';

const FEATURES = [
  { icon: <ShieldCheck className="text-primary-400" size={24} />, title: 'Secure Payments', desc: 'Powered by Razorpay with bank-grade encryption on every transaction.' },
  { icon: <Zap className="text-amber-400" size={24} />, title: 'Real-Time Tracking', desc: 'Live order status updates without refreshing — powered by Socket.io.' },
  { icon: <TruckIcon className="text-cyan-400" size={24} />, title: 'Fast Delivery', desc: 'Multiple sellers compete to deliver your order in record time.' },
];

const STATS = [
  { icon: <Package size={20} />, value: '10,000+', label: 'Products' },
  { icon: <Users size={20} />, value: '5,000+', label: 'Sellers' },
  { icon: <Star size={20} />, value: '4.8/5', label: 'Avg. Rating' },
  { icon: <TrendingUp size={20} />, value: '99.9%', label: 'Uptime' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    getProducts({ limit: 4 })
      .then((res) => setFeatured(res.data.products))
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 px-4">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-primary-300 font-medium mb-8 border border-primary-600/20">
            <Zap size={14} className="text-primary-400" />
            Multi-Vendor Platform · Razorpay Payments · Live Order Tracking
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6">
            Shop{' '}
            <span className="gradient-text">Smarter.</span>
            <br />
            <span className="text-white">Live Better.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Discover thousands of products from verified sellers, pay securely, and
            track every order in real-time — no refreshing needed.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/products"
              id="hero-shop-btn"
              className="btn-primary flex items-center gap-2 text-base px-8 py-4"
            >
              Start Shopping
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/register"
              id="hero-sell-btn"
              className="btn-secondary flex items-center gap-2 text-base px-8 py-4"
            >
              Become a Seller
            </Link>
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4 text-center">
                <div className="flex items-center justify-center text-primary-400 mb-2">
                  {stat.icon}
                </div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Why SwiftCart?</h2>
            <p className="text-gray-400">Everything you need for a premium shopping experience.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-hover rounded-2xl p-8 text-center">
                <div className="w-14 h-14 glass rounded-xl flex items-center justify-center mx-auto mb-5">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">Featured Products</h2>
              <p className="text-gray-400 text-sm">Handpicked from our top sellers</p>
            </div>
            <Link
              to="/products"
              className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm font-medium transition-colors"
            >
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative glass rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-indigo-600/10" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Selling?</h2>
              <p className="text-gray-400 mb-8">
                Join thousands of sellers. List your products, manage orders, and grow your business.
              </p>
              <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4">
                Create Seller Account <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
