import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { Plus, Search, UserPlus, SlidersHorizontal, MapPin, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface CustomersProps {
  setCurrentPage: (page: string) => void;
  setSelectedCustomerId: (id: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({ setCurrentPage, setSelectedCustomerId }) => {
  const { customers, enquiries, addCustomer, deleteCustomer } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Customer Deletion Modal State
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 12;
  
  // Add Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [prefSize, setPrefSize] = useState('L');
  const [prefCategory, setPrefCategory] = useState('Shirts');
  const [allowWhatsAppOffers, setAllowWhatsAppOffers] = useState(true);

  const handleCustomerClick = (id: string) => {
    setSelectedCustomerId(id);
    setCurrentPage('customer-profile');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || isSubmitting) return;
    
    setPhoneError(null);
    setIsSubmitting(true);
    try {
      await addCustomer({
        shopId: 'SHOP-1',
        name,
        phone,
        email: '', // NO email required
        location: location || 'Chennai, Tamil Nadu',
        allowWhatsAppOffers,
        preferences: {
          interestedIn: prefCategory,
          preferredSize: prefSize,
          preferredColors: ['Dark']
        },
        status: 'Active'
      });

      // Reset Form
      setName('');
      setPhone('');
      setLocation('');
      setAllowWhatsAppOffers(true);
      setPhoneError(null);
      setIsModalOpen(false);
    } catch (err: any) {
      const errMsg = err.message || 'Enter a valid 10-digit mobile number.';
      setPhoneError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.phone.includes(search) || 
                          c.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Customers</h2>
          <p className="text-sm text-slate-400">Manage and view your clothing shop customer profiles</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-150"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-soft flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-grow max-w-md">
          <input
            type="text"
            placeholder="Search by name, phone or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all duration-150"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter:
          </span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 text-slate-600 text-sm rounded-xl py-2 px-3 focus:outline-none focus:border-primary-400 transition-colors"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Customers List Grid / Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedCustomers.map((customer) => {
          const custEnquiries = enquiries.filter(e => e.customerId === customer.id);
          const totalEnq = custEnquiries.length;
          const purchasedEnq = custEnquiries.filter(e => e.purchaseStatus === 'Purchased').length;

          return (
            <div 
              key={customer.id}
              onClick={() => handleCustomerClick(customer.id)}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft hover:shadow-md cursor-pointer transition-all duration-150 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-primary-50 text-primary-600 font-extrabold text-sm flex items-center justify-center">
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{customer.name}</h3>
                      <p className="text-xs text-slate-400">{customer.phone}</p>
                    </div>
                  </div>
                  <StatusBadge status={customer.status} />
                </div>

                <div className="space-y-2 border-t border-slate-50 pt-3 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Location:</span>
                    <span className="font-medium text-slate-700 flex items-center gap-0.5"><MapPin className="w-3 h-3 text-slate-400" /> {customer.location}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Preferred Size:</span>
                    <span className="font-semibold text-primary-500">{customer.preferences.preferredSize || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Interested Category:</span>
                    <span className="font-medium text-slate-700">{customer.preferences.interestedIn || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Total Enquiries: <strong className="text-slate-700 font-bold">{totalEnq}</strong></span>
                <div className="flex items-center gap-2">
                  <span>Purchased: <strong className="text-success-600 font-bold">{purchasedEnq}</strong></span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerToDelete({ id: customer.id, name: customer.name });
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-600">
          <span>Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-800">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-500" /> Add New Customer
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all duration-150"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-500">Mobile Number *</label>
                  <span className="text-[10px] font-bold text-slate-400">10 Digits</span>
                </div>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all duration-150 font-medium"
                />
                {phoneError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1 animate-fadeIn">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. T. Nagar, Chennai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all duration-150"
                />
              </div>

              <div className="pt-1 pb-1">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={allowWhatsAppOffers}
                    onChange={(e) => setAllowWhatsAppOffers(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Allow order updates & occasional offers on WhatsApp
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Preferred Size</label>
                  <select
                    value={prefSize}
                    onChange={(e) => setPrefSize(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
                  >
                    <option value="S">Small (S)</option>
                    <option value="M">Medium (M)</option>
                    <option value="L">Large (L)</option>
                    <option value="XL">Extra Large (XL)</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Category Interest</label>
                  <select
                    value={prefCategory}
                    onChange={(e) => setPrefCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary-400 focus:bg-white transition-all"
                  >
                    <option value="Shirts">Shirts</option>
                    <option value="Kurtis">Kurtis</option>
                    <option value="Dresses">Dresses</option>
                    <option value="T-Shirts">T-Shirts</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-100 rounded-xl text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete customer?</h3>
                <p className="text-xs text-slate-400 font-medium">Customer: <strong className="text-slate-700">{customerToDelete.name}</strong></p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              This will permanently remove this customer and their enquiries, follow-ups, messages, and activity history from QuickR. Historical sales will be preserved.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (isDeleting || !customerToDelete) return;
                  setIsDeleting(true);
                  try {
                    await deleteCustomer(customerToDelete.id);
                    setCustomerToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete Customer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
