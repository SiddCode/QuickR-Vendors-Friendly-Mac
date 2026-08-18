import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Package, Search, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import type { Product } from '../types';

export const CATEGORIES = {
  "MEN'S WEAR": ['Shirts', 'T-Shirts', 'Polos', 'Jeans', 'Trousers', 'Formal Pants', 'Casual Pants', 'Chinos', 'Cargo Pants', 'Track Pants', 'Lowers', 'Shorts', 'Blazers', 'Suits', 'Waistcoats', 'Jackets', 'Hoodies', 'Sweatshirts', 'Innerwear', 'Ethnic Wear', 'Kurtas', 'Pyjamas', 'Dhotis', 'Sherwanis'],
  "WOMEN'S WEAR": ['Sarees', 'Kurtis', 'Salwar Suits', 'Churidar', 'Leggings', 'Palazzo', 'Dresses', 'Tops', 'T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Pants', 'Skirts', 'Shorts', 'Jumpsuits', 'Shrugs', 'Blouses', 'Dupattas', 'Lehengas', 'Gowns', 'Ethnic Wear'],
  "KIDS WEAR": ['Boys Shirts', 'Boys T-Shirts', 'Boys Jeans', 'Boys Trousers', 'Boys Shorts', 'Girls Dresses', 'Girls Tops', 'Girls Skirts', 'Kids Jeans', 'Kids Ethnic Wear', 'Kids Party Wear', 'School Wear', 'Baby Wear'],
  "UNISEX / COMMON": ['T-Shirts', 'Hoodies', 'Sweatshirts', 'Jackets', 'Jeans', 'Track Pants', 'Shorts', 'Lowers', 'Accessories'],
  "Custom": []
};

export const Products = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryGroup: "MEN'S WEAR",
    category: 'Shirts',
    customCategory: '',
    sellingPrice: '',
    originalPrice: '',
    sizes: '',
    colors: '',
    availability: '10',
    description: '',
    isActive: true
  });

  const allCategories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = filterCategory === 'All' || p.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      
      // Determine group for category
      let foundGroup = 'Custom';
      for (const [group, cats] of Object.entries(CATEGORIES)) {
        if ((cats as string[]).includes(product.category)) {
          foundGroup = group;
          break;
        }
      }
      
      setFormData({
        name: product.name,
        categoryGroup: foundGroup,
        category: foundGroup === 'Custom' ? 'Custom' : product.category,
        customCategory: foundGroup === 'Custom' ? product.category : '',
        sellingPrice: product.sellingPrice.toString(),
        originalPrice: product.originalPrice ? product.originalPrice.toString() : '',
        sizes: product.sizes.join(', '),
        colors: product.colors.join(', '),
        availability: product.availability.toString(),
        description: product.description || '',
        isActive: product.isActive
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        categoryGroup: "MEN'S WEAR",
        category: 'Shirts',
        customCategory: '',
        sellingPrice: '',
        originalPrice: '',
        sizes: '',
        colors: '',
        availability: '10',
        description: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCategory = formData.categoryGroup === 'Custom' ? formData.customCategory : formData.category;
    
    const payload = {
      name: formData.name,
      category: finalCategory,
      sellingPrice: Number(formData.sellingPrice),
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      sizes: formData.sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: formData.colors.split(',').map(c => c.trim()).filter(Boolean),
      availability: Number(formData.availability) || 0,
      description: formData.description,
      isActive: formData.isActive
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, payload);
    } else {
      await addProduct(payload);
    }
    setIsModalOpen(false);
  };

  const handleDeactivate = async (id: string) => {
    if (confirm('Are you sure you want to deactivate this product? It will no longer be selectable for new enquiries.')) {
      await deleteProduct(id);
    }
  };

  return (
    <div className="flex-grow p-4 lg:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800">Products ({products.length})</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-400"
          />
        </div>
        <select 
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2 bg-white focus:outline-none focus:border-primary-400 min-w-[200px]"
        >
          <option value="All">All Categories</option>
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredProducts.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <Package className="w-12 h-12 mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">No products found</h3>
            <p className="mb-6">You don't have any products matching this criteria.</p>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-primary-50 text-primary-600 px-6 py-2 rounded-lg font-bold hover:bg-primary-100"
            >
              + Add Product
            </button>
          </div>
        ) : (
          <div>
            {/* Mobile Product Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredProducts.map(prod => (
                <div key={prod.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{prod.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{prod.sizes.join(', ')} • {prod.colors.join(', ')}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                      {prod.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">₹{prod.sellingPrice}</span>
                      {prod.originalPrice ? <span className="text-[10px] text-slate-400 line-through ml-1.5">₹{prod.originalPrice}</span> : null}
                    </div>
                    {prod.availability > 0 ? (
                      <span className="text-emerald-600 font-semibold text-xs">{prod.availability} in stock</span>
                    ) : (
                      <span className="text-rose-500 font-semibold text-xs">Out of stock</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
                    {prod.isActive ? (
                      <span className="text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">Active</span>
                    ) : (
                      <span className="text-slate-400 font-bold text-[11px] bg-slate-100 px-2 py-0.5 rounded">Disabled</span>
                    )}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(prod)}
                        className="p-1.5 text-slate-500 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeactivate(prod.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                  <tr>
                    <th className="p-4 font-semibold">Product Info</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Price</th>
                    <th className="p-4 font-semibold">Stock</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{prod.name}</p>
                        <p className="text-xs text-slate-400">{prod.sizes.join(', ')} • {prod.colors.join(', ')}</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                          {prod.category}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-700">₹{prod.sellingPrice}</p>
                        {prod.originalPrice ? <p className="text-xs text-slate-400 line-through">₹{prod.originalPrice}</p> : null}
                      </td>
                      <td className="p-4">
                        {prod.availability > 0 ? (
                          <span className="text-success-600 font-semibold text-sm">{prod.availability} in stock</span>
                        ) : (
                          <span className="text-danger-500 font-semibold text-sm">Out of stock</span>
                        )}
                      </td>
                      <td className="p-4">
                        {prod.isActive ? (
                          <span className="flex items-center gap-1.5 text-success-600 text-xs font-bold bg-success-50 px-2 py-1 rounded-md w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold bg-slate-100 px-2 py-1 rounded-md w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Disabled
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(prod)}
                            className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeactivate(prod.id)}
                            className="p-1.5 text-slate-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Product Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none"
                  placeholder="e.g. Premium Black Formal Shirt"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Category Group *</label>
                  <select 
                    value={formData.categoryGroup}
                    onChange={e => {
                      const group = e.target.value;
                      setFormData({
                        ...formData, 
                        categoryGroup: group,
                        category: group === 'Custom' ? 'Custom' : CATEGORIES[group as keyof typeof CATEGORIES][0]
                      });
                    }}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none bg-white"
                  >
                    {Object.keys(CATEGORIES).map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Category *</label>
                  {formData.categoryGroup === 'Custom' ? (
                    <input 
                      type="text" 
                      required
                      value={formData.customCategory}
                      onChange={e => setFormData({...formData, customCategory: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none"
                      placeholder="e.g. Temple Wear"
                    />
                  ) : (
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none bg-white"
                    >
                      {CATEGORIES[formData.categoryGroup as keyof typeof CATEGORIES].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Selling Price (₹) *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none"
                    placeholder="1499"
                  />
                  {editingProduct && (
                    <p className="text-xs text-warning-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Historical sales keep the old price.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Original / MRP Price (₹) (Optional)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.originalPrice}
                    onChange={e => setFormData({...formData, originalPrice: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none"
                    placeholder="1999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Sizes (Comma separated)</label>
                  <input 
                    type="text" 
                    value={formData.sizes}
                    onChange={e => setFormData({...formData, sizes: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none"
                    placeholder="S, M, L, XL"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Colors (Comma separated)</label>
                  <input 
                    type="text" 
                    value={formData.colors}
                    onChange={e => setFormData({...formData, colors: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none"
                    placeholder="Red, Blue, Black"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700">Stock Availability</label>
                <input 
                  type="number" 
                  min="0"
                  value={formData.availability}
                  onChange={e => setFormData({...formData, availability: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 focus:border-primary-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1 flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700">Active Status:</label>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`w-12 h-6 rounded-full relative transition-colors ${formData.isActive ? 'bg-success-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${formData.isActive ? 'left-7' : 'left-1'}`}></div>
                </button>
                <span className="text-sm font-medium text-slate-500">{formData.isActive ? 'Active (Visible for new enquiries)' : 'Inactive (Hidden from new enquiries)'}</span>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
