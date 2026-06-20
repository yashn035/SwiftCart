import { useState, useEffect } from 'react';
import { CreditCard, Gift, ArrowDownRight, ArrowUpRight, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [amountInput, setAmountInput] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await api.get('/payment/wallet/balance');
      setBalance(res.data.walletBalance);
      setTransactions(res.data.transactions);
    } catch (err) {
      toast.error('Failed to load wallet data');
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    const val = Number(amountInput);
    if (!val || val <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/payment/wallet/add', { amount: val });
      setBalance(res.data.walletBalance);
      setTransactions([res.data.transaction, ...transactions]);
      setAmountInput('');
      toast.success(`Successfully added ₹${val} to your wallet!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add funds');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/payment/wallet/redeem', { code: voucherCode });
      setBalance(res.data.walletBalance);
      setTransactions([res.data.transaction, ...transactions]);
      setVoucherCode('');
      toast.success(res.data.message || 'Gift card redeemed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired voucher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">My Wallet</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your funds and redeem gift vouchers</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Wallet Balance Card */}
          <div className="md:col-span-1 glass rounded-2xl p-6 relative overflow-hidden bg-gradient-to-br from-primary-600/30 to-purple-600/10 border border-white/10 flex flex-col justify-between min-h-[180px]">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <CreditCard size={100} />
            </div>
            <div>
              <p className="text-xs text-primary-300 font-semibold tracking-wider uppercase mb-1">Active Balance</p>
              <h2 className="text-4xl font-black text-white">₹{balance.toLocaleString('en-IN')}</h2>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-4">
              <Check size={14} className="text-emerald-400" /> Secure payment methods supported
            </div>
          </div>

          {/* Add Funds Form */}
          <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Plus size={16} className="text-primary-400" /> Add Money to Wallet
            </h3>
            <form onSubmit={handleAddFunds} className="space-y-3">
              <input
                type="number"
                min="10"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Enter amount (₹)"
                className="input-field py-2 text-sm"
              />
              <div className="flex gap-2">
                {[100, 500, 1000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountInput(String(val))}
                    className="flex-1 py-1.5 text-xs glass rounded-lg hover:border-primary-500/40 hover:text-primary-300 transition-all"
                  >
                    +₹{val}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-1.5"
              >
                Add Funds
              </button>
            </form>
          </div>

          {/* Redeem Voucher Form */}
          <div className="glass rounded-2xl p-6 border border-white/10 flex flex-col justify-between">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Gift size={16} className="text-yellow-400" /> Redeem Gift Card
            </h3>
            <form onSubmit={handleRedeemVoucher} className="space-y-3">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Enter Code (e.g. WELCOME100)"
                className="input-field py-2 text-sm uppercase"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-secondary w-full py-2 text-sm flex items-center justify-center gap-1.5"
              >
                Redeem Code
              </button>
            </form>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card">
          <h3 className="font-bold text-white mb-4">Transaction History</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">No transaction records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-white/5 pb-2">
                    <th className="pb-3 font-semibold">Transaction ID</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="text-gray-200">
                      <td className="py-3.5 font-mono text-xs text-gray-400">{tx.transactionId || tx._id}</td>
                      <td className="py-3.5 flex items-center gap-2">
                        {tx.type === 'credit' ? (
                          <span className="p-1 rounded bg-emerald-500/10 text-emerald-400"><ArrowUpRight size={14} /></span>
                        ) : (
                          <span className="p-1 rounded bg-red-500/10 text-red-400"><ArrowDownRight size={14} /></span>
                        )}
                        <span>{tx.reason}</span>
                      </td>
                      <td className="py-3.5 text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className={`py-3.5 text-right font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
