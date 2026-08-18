import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, X, Receipt } from 'lucide-react';

interface BillingProps {
  setCurrentPage: (page: string) => void;
  billingInitialData?: {
    customerId?: string;
    enquiryId?: string;
    followUpId?: string;
    productId?: string;
    rate?: number;
  } | null;
}

interface BillItem {
  id: string; // temp id for UI
  productId: string;
  quantity: number;
  rate: number;
}

export const Billing: React.FC<BillingProps> = ({ setCurrentPage, billingInitialData }) => {
  const { customers, products, createSale } = useApp();

  const activeProducts = products.filter(p => p.isActive);

  const [isWalkIn, setIsWalkIn] = useState(!billingInitialData?.customerId);
  const [selectedCustomerId, setSelectedCustomerId] = useState(billingInitialData?.customerId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [items, setItems] = useState<BillItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');

  useEffect(() => {
    if (billingInitialData && billingInitialData.productId) {
      const prod = activeProducts.find(p => p.id === billingInitialData.productId);
      if (prod) {
        setItems([{
          id: Date.now().toString(),
          productId: prod.id,
          quantity: 1,
          rate: billingInitialData.rate !== undefined ? billingInitialData.rate : prod.sellingPrice
        }]);
      }
    } else {
      // Default one empty item
      if (activeProducts.length > 0) {
        setItems([{
          id: Date.now().toString(),
          productId: activeProducts[0].id,
          quantity: 1,
          rate: activeProducts[0].sellingPrice
        }]);
      }
    }
  }, [billingInitialData]);

  const handleAddItem = () => {
    if (activeProducts.length === 0) return;
    setItems([...items, {
      id: Date.now().toString(),
      productId: activeProducts[0].id,
      quantity: 1,
      rate: activeProducts[0].sellingPrice
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Auto-update rate if product changes
        if (field === 'productId') {
          const prod = activeProducts.find(p => p.id === value);
          if (prod) updated.rate = prod.sellingPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  // Calculations
  const enrichedItems = items.map(item => {
    const prod = products.find(p => p.id === item.productId);
    return {
      ...item,
      productName: prod?.name || 'Unknown Product',
      category: prod?.category || 'Category',
      total: item.quantity * item.rate
    };
  });

  const subtotal = enrichedItems.reduce((acc, item) => acc + item.total, 0);
  const validatedDiscountPercent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = Number(((subtotal * validatedDiscountPercent) / 100).toFixed(2));
  const totalAmount = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  const handleDiscountChange = (valStr: string) => {
    if (valStr === '') {
      setDiscountPercent(0);
      return;
    }
    const val = parseFloat(valStr);
    if (isNaN(val)) return;
    if (val < 0) {
      setDiscountPercent(0);
    } else if (val > 100) {
      setDiscountPercent(100);
    } else {
      setDiscountPercent(val);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allowWhatsAppOffers, setAllowWhatsAppOffers] = useState<boolean>(true);

  const handleGenerateBill = async () => {
    if (items.length === 0) return alert('Please add at least one item');
    if (isSubmitting) return;
    
    let finalCustomerId = '';
    let finalCustomerName = 'Walk-in Customer';
    
    if (!isWalkIn) {
      if (!selectedCustomerId) return alert('Please select a customer');
      const c = customers.find(x => x.id === selectedCustomerId);
      if (c) {
        finalCustomerId = c.id;
        finalCustomerName = c.name;
      }
    } else if (customerName.trim()) {
      finalCustomerName = customerName.trim();
    }

    const payload = {
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      customerPhone: isWalkIn && customerPhone.trim() ? customerPhone.trim() : undefined,
      allowWhatsAppOffers: isWalkIn && customerPhone.trim() ? allowWhatsAppOffers : undefined,
      enquiryId: billingInitialData?.enquiryId || '',
      followUpId: billingInitialData?.followUpId || '',
      items: enrichedItems.map(i => ({
        productId: i.productId,
        productName: i.productName,
        category: i.category,
        quantity: i.quantity,
        rate: i.rate,
        total: i.total
      })),
      subtotal,
      discount: discountAmount,
      totalAmount,
      paymentMethod,
      source: billingInitialData?.enquiryId ? 'quickr_followup' : 'direct'
    };

    setIsSubmitting(true);
    try {
      const sale = await createSale(payload);
      if (sale) {
        setCurrentPage('sales'); // navigate to sales list
      }
    } catch (err) {
      console.error('Failed to generate bill:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-grow p-4 lg:p-8 space-y-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">New Bill</h1>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Customer Details (Optional)</h2>
            
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  checked={isWalkIn} 
                  onChange={() => setIsWalkIn(true)} 
                  className="text-primary-500 focus:ring-primary-400 w-4 h-4"
                />
                Walk-in Customer
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <input 
                  type="radio" 
                  checked={!isWalkIn} 
                  onChange={() => setIsWalkIn(false)} 
                  className="text-primary-500 focus:ring-primary-400 w-4 h-4"
                />
                Existing Customer
              </label>
            </div>

            {isWalkIn ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ravi"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number (Optional)</label>
                  <input 
                    type="tel" 
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                {customerPhone.trim() && (
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowWhatsAppOffers}
                      onChange={e => setAllowWhatsAppOffers(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-slate-600">
                      Allow order updates & occasional offers on WhatsApp
                    </span>
                  </label>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Select Customer *</label>
                <select 
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="p-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Items</h2>
            
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-grow w-full">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Product</label>
                    <select 
                      value={item.productId}
                      onChange={e => handleItemChange(item.id, 'productId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400"
                    >
                      {activeProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full md:w-24 shrink-0">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
                    <input 
                      type="number" 
                      min="1"
                      value={item.quantity}
                      onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 text-center"
                    />
                  </div>

                  <div className="w-full md:w-32 shrink-0">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Rate (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={item.rate}
                      onChange={e => handleItemChange(item.id, 'rate', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 text-center font-bold text-slate-700"
                    />
                  </div>

                  {items.length > 1 && (
                    <button 
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-slate-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg mb-0.5 shrink-0 transition-colors"
                      title="Remove item"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={handleAddItem}
              className="mt-4 flex items-center gap-1.5 text-primary-600 font-bold text-sm hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Another Item
            </button>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between gap-6">
            <div className="w-full md:w-1/2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Payment Method</h2>
              <div className="grid grid-cols-2 gap-3">
                {['Cash', 'UPI', 'Card', 'Other'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all ${
                      paymentMethod === method 
                        ? 'bg-primary-50 border-primary-500 text-primary-600 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm font-medium text-slate-600">
                <span className="flex items-center gap-1 font-semibold text-slate-700">Discount:</span>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    step="any"
                    value={discountPercent === 0 ? '' : discountPercent}
                    onChange={e => handleDiscountChange(e.target.value)}
                    placeholder="0"
                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-sm font-bold focus:outline-none focus:border-primary-500 text-center"
                  />
                  <span className="font-bold text-slate-600">%</span>
                </div>
              </div>

              {validatedDiscountPercent > 0 && (
                <div className="flex justify-between items-center text-xs font-semibold text-emerald-600">
                  <span>Discount ({validatedDiscountPercent}%):</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-base sm:text-lg font-bold text-slate-800">
                <span>Grand Total</span>
                <span className="text-primary-600 font-extrabold">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerateBill}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-sm hover:bg-primary-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <Receipt className="w-5 h-5" />
              {isSubmitting ? 'Generating Bill...' : 'Generate & Print Bill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
