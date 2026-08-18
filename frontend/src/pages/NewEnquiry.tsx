import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Check, 
  FileText
} from 'lucide-react';

import { calculateFollowUpDateIST } from '../utils/date';

interface NewEnquiryProps {
  setCurrentPage: (page: string) => void;
  setSelectedCustomerId: (id: string) => void;
  initialCustomerId?: string;
}

export const NewEnquiry: React.FC<NewEnquiryProps> = ({ 
  setCurrentPage, 
  setSelectedCustomerId,
  initialCustomerId 
}) => {
  const { customers, products, addCustomer, addEnquiry } = useApp();

  // Selected customer state
  const [selectedCustId, setSelectedCustId] = useState(initialCustomerId || customers[0]?.id || '');
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Add new customer form toggle
  const [showAddCustForm, setShowAddCustForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLoc, setNewCustLoc] = useState('Chennai, Tamil Nadu');

  // Step state
  const activeProducts = products.filter(p => p.isActive);
  const [prodId, setProdId] = useState(activeProducts[0]?.id || '');
  const currentProduct = activeProducts.find(p => p.id === prodId) || activeProducts[0];
  
  const [size, setSize] = useState(currentProduct?.sizes?.[0] || 'N/A');
  const [color, setColor] = useState(currentProduct?.colors?.[0] || 'N/A');
  const [qty, setQty] = useState(1);
  const interest = 'Interested';
  const purchaseStatus = "Didn't Purchase";
  const [recommendFollowUp, setRecommendFollowUp] = useState(true);
  const [followUpDate, setFollowUpDate] = useState('Tomorrow');
  const [notes, setNotes] = useState('');

  const currentCustomer = customers.find(c => c.id === selectedCustId);

  // Update size/color defaults when product changes
  React.useEffect(() => {
    if (currentProduct) {
      if (!currentProduct.sizes.includes(size)) setSize(currentProduct.sizes[0] || 'N/A');
      if (!currentProduct.colors.includes(color)) setColor(currentProduct.colors[0] || 'N/A');
    }
  }, [prodId, currentProduct]);

  const handleCustSelect = (id: string) => {
    setSelectedCustId(id);
    setCustSearch('');
    setShowCustDropdown(false);
  };

  const handleAddNewCustomerSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    const newCust = await addCustomer({
      shopId: 'SHOP-1',
      name: newCustName,
      phone: newCustPhone,
      email: `${newCustName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      location: newCustLoc,
      preferences: {
        interestedIn: 'Shirts',
        preferredSize: 'XL',
        preferredColors: ['Dark']
      },
      status: 'Active'
    });

    if (newCust) {
      setSelectedCustId(newCust.id);
      setShowAddCustForm(false);
      setNewCustName('');
      setNewCustPhone('');
    }
  };

  const handleCreateEnquiry = async () => {
    if (!selectedCustId || !prodId) return;

    const calculatedScheduledAt = recommendFollowUp 
      ? calculateFollowUpDateIST(followUpDate)
      : undefined;

    console.log('[NewEnquiry] Creating enquiry:', {
      purchaseStatus,
      interest,
      recommendFollowUp,
      followUpDate,
      calculatedScheduledAt: calculatedScheduledAt?.toISOString()
    });

    await addEnquiry({
      shopId: 'SHOP-1',
      customerId: selectedCustId,
      productId: prodId,
      size,
      color,
      quantity: qty,
      interest,
      purchaseStatus,
      notes,
      scheduledAt: calculatedScheduledAt ? calculatedScheduledAt.toISOString() : undefined,
      followUpDate: recommendFollowUp ? followUpDate : undefined
    });

    // Navigate to the Customer Profile or Dashboard
    setSelectedCustomerId(selectedCustId);
    setCurrentPage('customer-profile');
  };

  if (customers.length === 0) {
    return (
      <div className="flex-grow p-12 flex flex-col items-center justify-center font-sans text-slate-500">
        <h2 className="text-xl font-bold text-slate-700 mb-2">Create a customer first.</h2>
        <p className="mb-6">You need at least one customer to create an enquiry.</p>
        <button onClick={() => setCurrentPage('customers')} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700">Go to Customers</button>
      </div>
    );
  }

  if (activeProducts.length === 0) {
    return (
      <div className="flex-grow p-12 flex flex-col items-center justify-center font-sans text-slate-500">
        <h2 className="text-xl font-bold text-slate-700 mb-2">Add a product first to create an enquiry.</h2>
        <p className="mb-6">You need at least one active product to create an enquiry.</p>
        <button onClick={() => setCurrentPage('products')} className="bg-primary-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-700">Go to Products</button>
      </div>
    );
  }

  const customerListFiltered = customers.filter(c => 
    c.name.toLowerCase().includes(custSearch.toLowerCase()) || 
    c.phone.includes(custSearch)
  );

  return (
    <div className="flex-grow p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setCurrentPage('customers')} 
          className="text-slate-500 hover:text-slate-700 flex items-center gap-1.5 font-bold text-xs"
        >
          <ArrowLeft className="w-4.5 h-4.5" /> Back to Customers
        </button>
      </div>

      <div className="flex flex-col">
        <h2 className="text-xl font-bold text-slate-800">New Enquiry</h2>
        <p className="text-xs text-slate-400">Create a new customer enquiry</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side 6-Step Stepper */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* STEP 1: CUSTOMER */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center">1</span>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Customer</h3>
            </div>

            {/* Search Dropdown Selector */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Search existing customer</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={currentCustomer ? `${currentCustomer.name} (${currentCustomer.phone})` : "Type name or phone number..."}
                  value={custSearch}
                  onChange={(e) => {
                    setCustSearch(e.target.value);
                    setShowCustDropdown(true);
                  }}
                  onFocus={() => setShowCustDropdown(true)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
                />
                <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400" />
              </div>

              {showCustDropdown && custSearch && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10 text-sm">
                  {customerListFiltered.length > 0 ? (
                    customerListFiltered.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCustSelect(c.id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                      >
                        <span className="font-semibold text-slate-700">{c.name}</span>
                        <span className="text-xs text-slate-400">{c.phone}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">No customers found</div>
                  )}
                </div>
              )}
            </div>

            {/* Add New Customer Toggle */}
            <div className="pt-2 border-t border-slate-50">
              {!showAddCustForm ? (
                <button 
                  onClick={() => setShowAddCustForm(true)}
                  className="text-xs font-bold text-primary-500 hover:bg-primary-50 border border-primary-200 border-dashed rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add New Customer
                </button>
              ) : (
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700">Add New Customer Form</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      className="bg-white border border-slate-100 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-primary-400"
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value)}
                      className="bg-white border border-slate-100 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-primary-400"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Location (e.g. Chennai, Tamil Nadu)"
                    value={newCustLoc}
                    onChange={(e) => setNewCustLoc(e.target.value)}
                    className="w-full bg-white border border-slate-100 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-primary-400"
                  />
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => setShowAddCustForm(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleAddNewCustomerSubmit}
                      className="text-[10px] font-bold bg-primary-500 text-white hover:bg-primary-600 px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Save Customer
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: PRODUCT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center">2</span>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Product</h3>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Product *</label>
              <select
                value={prodId}
                onChange={(e) => setProdId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
              >
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            {currentProduct && (
              <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-500">Category: <strong className="text-slate-800">{currentProduct.category}</strong></span>
                  <span className="text-slate-500">Current Price: <strong className="text-slate-800">₹{currentProduct.sellingPrice.toLocaleString('en-IN')}</strong></span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-slate-500">Available Sizes: <strong className="text-slate-800">{currentProduct.sizes.join(', ') || 'N/A'}</strong></span>
                  <span className="text-slate-500">Available Colors: <strong className="text-slate-800">{currentProduct.colors.join(', ') || 'N/A'}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: CUSTOMER REQUIREMENT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center">3</span>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Customer Requirement</h3>
            </div>

            {/* Size Stepper Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Size *</label>
              <div className="flex flex-wrap gap-2">
                {currentProduct?.sizes?.length ? currentProduct.sizes.map(sz => (
                  <button
                    key={sz}
                    onClick={() => setSize(sz)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                      size === sz 
                        ? 'bg-primary-50 border-primary-500 text-primary-500 shadow-sm' 
                        : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {sz}
                  </button>
                )) : <span className="text-xs text-slate-400">N/A</span>}
              </div>
            </div>

            {/* Color select dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Color *</label>
              {currentProduct?.colors?.length ? (
                <div className="flex flex-wrap gap-2">
                  {currentProduct.colors.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                        color === c 
                          ? 'bg-primary-50 border-primary-500 text-primary-500 shadow-sm' 
                          : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : <span className="text-xs text-slate-400">N/A</span>}
            </div>

            {/* Quantity select counter */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Quantity *</label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setQty(prev => Math.max(1, prev - 1))}
                  className="w-9 h-9 rounded-lg border border-slate-100 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-bold text-slate-700">{qty}</span>
                <button 
                  onClick={() => setQty(prev => prev + 1)}
                  className="w-9 h-9 rounded-lg border border-slate-100 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* STEP 4: FOLLOW-UP STATUS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center">4</span>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Follow-up Status</h3>
            </div>
            
            <div className="p-4 bg-primary-50/40 border border-primary-100 rounded-xl space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse shrink-0" />
                <span className="font-bold text-xs text-slate-800">Follow-up Required</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pl-4">
                This customer has not purchased yet. A follow-up will be created to continue the conversation.
              </p>
            </div>
          </div>

          {/* STEP 5: FOLLOW-UP SCHEDULE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center">5</span>
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Follow-up</h3>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recommendFollowUp}
                  onChange={(e) => setRecommendFollowUp(e.target.checked)}
                  className="rounded text-primary-500 focus:ring-primary-400 w-4 h-4 border-slate-200"
                />
                Recommend follow-up
              </label>

              {recommendFollowUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Follow-up *</label>
                  <select
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
                  >
                    <option value="Today">Today</option>
                    <option value="Tomorrow">Tomorrow</option>
                    <option value="3 days">3 days</option>
                    <option value="Next week">Next week</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Notes field */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-3">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" /> Notes
            </h3>
            <textarea
              placeholder="Add any additional notes... (e.g. Customer prefers dark colors...)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
            />
          </div>

          {/* Stepper Footer actions */}
          <div className="flex gap-4">
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className="px-6 py-2.5 border border-slate-100 rounded-xl text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateEnquiry}
              className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Create Enquiry
            </button>
          </div>

        </div>

        {/* Right Side Summary panel & What happens next */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Summary Panel */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Enquiry Summary</h3>
            
            {/* Customer info */}
            {currentCustomer && (
              <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                <div className="w-10 h-10 rounded-full bg-primary-50 text-primary-600 font-extrabold text-sm flex items-center justify-center">
                  {currentCustomer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800">{currentCustomer.name}</p>
                  <p className="text-xs text-slate-400">{currentCustomer.phone}</p>
                  <p className="text-[10px] text-slate-400">{currentCustomer.location}</p>
                </div>
              </div>
            )}

            {/* Product details */}
            {currentProduct && (
              <div className="flex justify-between items-center text-xs font-semibold pb-3 border-b border-slate-50">
                <span className="text-slate-400">Product</span>
                <span className="text-slate-800 text-right">
                  <strong className="block text-slate-800">{currentProduct.name}</strong>
                  <span className="text-[10px] text-slate-400">Category: {currentProduct.category}</span>
                </span>
                <span className="text-slate-800 font-bold ml-2">₹{currentProduct.sellingPrice.toLocaleString('en-IN')}</span>
              </div>
            )}

            {/* Specs list */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Size</span>
                <span className="font-bold text-slate-700 bg-primary-50 px-2 py-0.5 rounded text-[10px]">{size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Color</span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  {color}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Quantity</span>
                <span className="font-bold text-slate-700">{qty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">Follow-up Required</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Follow-up</span>
                <span className="font-bold text-slate-700">{recommendFollowUp ? followUpDate : 'No'}</span>
              </div>
              {notes && (
                <div className="flex flex-col gap-1 border-t border-slate-50 pt-2.5">
                  <span className="text-slate-400 font-semibold">Notes</span>
                  <span className="text-slate-600 text-xs italic">"{notes}"</span>
                </div>
              )}
            </div>
          </div>

          {/* What happens next card */}
          <div className="bg-primary-50/20 p-6 rounded-2xl border border-primary-100/30 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">What happens next?</h3>
            <div className="space-y-3.5 text-xs text-slate-600 font-medium">
              <div className="flex items-start gap-2.5">
                <div className="p-0.5 bg-primary-100 text-primary-600 rounded-full mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p>This enquiry will be saved and added to the customer profile</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-0.5 bg-primary-100 text-primary-600 rounded-full mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p>You will be reminded on the follow-up date</p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-0.5 bg-primary-100 text-primary-600 rounded-full mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p>You can track progress in Follow-ups section</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
