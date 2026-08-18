import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Filter, ArrowLeft } from 'lucide-react';

interface AdminProductsProps {
  setCurrentPage: (page: string) => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({ setCurrentPage }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => { loadShops(); }, []);

  useEffect(() => { loadProducts(); }, [selectedShopId, selectedCategory]);

  const loadShops = async () => {
    try {
      const data = await api.adminGetShops();
      setShops(data);
    } catch (err) {
      console.error('Failed to load shops:', err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.adminGetProducts(selectedShopId || undefined, selectedCategory || undefined);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto w-full font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('admin-dashboard')} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Global Product Inventory</h1>
            <p className="text-sm text-slate-500">Read-Only view of product listings across all registered shops</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200 rounded-xl">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedShopId}
            onChange={e => setSelectedShopId(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
          >
            <option value="">🌐 All Shops</option>
            {shops.map(s => (
              <option key={s.customId} value={s.customId}>{s.name} ({s.customId})</option>
            ))}
          </select>
        </div>

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none"
        >
          <option value="">All Categories</option>
          <option value="Shirts">Shirts</option>
          <option value="T-Shirts">T-Shirts</option>
          <option value="Jeans">Jeans</option>
          <option value="Trousers">Trousers</option>
          <option value="Ethnic Wear">Ethnic Wear</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      {/* Product Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading products...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                  <th className="px-5 py-3.5 text-left">Product Name</th>
                  <th className="px-5 py-3.5 text-left">Category</th>
                  <th className="px-5 py-3.5 text-left">Shop</th>
                  <th className="px-5 py-3.5 text-left">Sizes / Colors</th>
                  <th className="px-5 py-3.5 text-right">Selling Price</th>
                  <th className="px-5 py-3.5 text-center">Available Stock</th>
                  <th className="px-5 py-3.5 text-left">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{p.name}</td>
                    <td className="px-5 py-4 text-slate-600 font-medium">{p.category}</td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">
                        {p.shopName}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div>Sizes: {p.sizes?.join(', ') || 'N/A'}</div>
                      <div>Colors: {p.colors?.join(', ') || 'N/A'}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-800">
                      ₹{(p.sellingPrice || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-700">{p.availability}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && (
              <div className="p-8 text-center text-slate-400">No products found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
