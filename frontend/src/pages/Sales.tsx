import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, Plus, Search, Receipt, ChevronDown, ChevronUp, Download, FileText, RefreshCw, AlertCircle, Trash2, CheckSquare, Square, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { openWhatsApp, buildWhatsAppBillMessage } from '../utils/whatsapp';

interface SalesProps {
  setCurrentPage: (page: string) => void;
}

export const Sales: React.FC<SalesProps> = ({ setCurrentPage }) => {
  const { sales, deleteSales, shopName, customers } = useApp();
  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  // Selection & Deletion State
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export Sales Report State
  const [exportPeriod, setExportPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todaySales = sales.filter(s => new Date(s.createdAt) >= todayStart);
  const todayRevenue = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalRevenue = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const recoveredAmount = sales
    .filter(s => s.source === 'quickr_followup')
    .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const filteredSales = sales.filter(s => {
    const matchSearch = !search ||
      (s.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName || '').toLowerCase().includes(search.toLowerCase());
    const matchPayment = filterPayment === 'All' || s.paymentMethod === filterPayment;
    return matchSearch && matchPayment;
  });

  const handleToggleSelectAll = () => {
    if (selectedSaleIds.length === filteredSales.length && filteredSales.length > 0) {
      setSelectedSaleIds([]);
    } else {
      setSelectedSaleIds(filteredSales.map(s => s.id));
    }
  };

  const handleToggleSelectSale = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSaleIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedConfirm = async () => {
    if (selectedSaleIds.length === 0 || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteSales(selectedSaleIds);
      if (success) {
        setSelectedSaleIds([]);
        setShowDeleteModal(false);
      }
    } catch (err) {
      console.error('Delete sales error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendBillWhatsApp = (sale: any, e: React.MouseEvent) => {
    e.stopPropagation();
    let phoneToUse = sale.customerPhone;
    if (!phoneToUse && sale.customerId) {
      const foundCust = customers.find(c => c.id === sale.customerId);
      if (foundCust) phoneToUse = foundCust.phone;
    }

    if (!phoneToUse) {
      alert('Customer phone number is required to send the bill on WhatsApp.');
      return;
    }

    const billMsg = buildWhatsAppBillMessage(shopName, sale.customerName || 'Customer', sale);
    openWhatsApp(phoneToUse, billMsg, shopName, sale.customerName || 'Customer');
  };

  return (
    <div className="flex-grow p-4 lg:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Sales & Bills</h2>
          <p className="text-xs text-slate-400">All billing records and transactions</p>
        </div>
        <button
          onClick={() => setCurrentPage('billing')}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Bill
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 mb-1">Today's Revenue</p>
          <p className="text-2xl font-black text-success-600">₹{todayRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">{todaySales.length} bills today</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-slate-800">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 mt-1">{sales.length} total bills</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-slate-400 mb-1">Recovered via Follow-up</p>
          <p className="text-2xl font-black text-purple-600">₹{recoveredAmount.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-purple-500" />
            <p className="text-xs text-slate-400">
              {Math.round((recoveredAmount / (totalRevenue || 1)) * 100)}% of total
            </p>
          </div>
        </div>
      </div>

      {/* Export Sales Report Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft space-y-4 font-sans text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Export Sales Report</h3>
              <p className="text-xs text-slate-400 font-medium">Download dynamic Excel (.xlsx) report for accounting & records</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => {
                setExportPeriod(p.id as any);
                setExportError(null);
                setExportSuccess(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                exportPeriod === p.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {exportPeriod === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fadeIn">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Start Date (IST)</label>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">End Date (IST)</label>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {exportError && (
          <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl flex items-center gap-2 text-xs text-danger-700 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {exportSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold">
            {exportSuccess}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={async () => {
              setExporting(true);
              setExportError(null);
              setExportSuccess(null);
              try {
                await api.exportSalesReport({
                  period: exportPeriod,
                  startDate: customStartDate || undefined,
                  endDate: customEndDate || undefined
                });
                setExportSuccess('Sales report downloaded successfully.');
              } catch (err: any) {
                setExportError(err.message || 'Unable to generate sales report.');
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating Excel...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Excel Report (.xlsx)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by invoice number or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 bg-white"
          />
        </div>
        <select
          value={filterPayment}
          onChange={e => setFilterPayment(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2 bg-white text-sm focus:outline-none focus:border-primary-400"
        >
          <option value="All">All Payments</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Selection Action Toolbar */}
      {selectedSaleIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="bg-rose-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              {selectedSaleIds.length} Selected
            </span>
            <span className="text-xs font-semibold text-rose-800">
              Select bills to perform batch actions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-100/50 transition-colors"
            >
              {selectedSaleIds.length === filteredSales.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete Selected ({selectedSaleIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Delete selected sales?</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  These {selectedSaleIds.length} sale(s) will be permanently removed from QuickR. Stock quantities will be restored automatically.
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
              ⚠️ Deleted sales cannot be recovered.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelectedConfirm}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-500">
            <Receipt className="w-12 h-12 mb-4 text-slate-200" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">No bills yet</h3>
            <p className="mb-6 text-sm">Start creating bills to track your sales.</p>
            <button
              onClick={() => setCurrentPage('billing')}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create First Bill
            </button>
          </div>
        ) : (
          <div>
            {/* Mobile Sales Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredSales.map(sale => (
                <div
                  key={sale.id}
                  onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                  className={`p-4 space-y-2.5 cursor-pointer transition-colors ${selectedSaleIds.includes(sale.id) ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={(e) => handleToggleSelectSale(sale.id, e)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      >
                        {selectedSaleIds.includes(sale.id) ? (
                          <CheckSquare className="w-5 h-5 text-rose-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{sale.invoiceNumber || 'N/A'}</p>
                        <p className="text-xs text-slate-500 font-medium">{sale.customerName || 'Walk-in'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-primary-600 text-base">₹{(sale.totalAmount || 0).toLocaleString('en-IN')}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {sale.paymentMethod}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-50">
                    <span>Date: {new Date(sale.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleSendBillWhatsApp(sale, e)}
                        className="text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"
                        title="Send Bill on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Send Bill
                      </button>
                      <span className="text-primary-600 font-semibold">{sale.items?.length || 0} items {expandedSale === sale.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expandedSale === sale.id && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl animate-fadeIn">
                      <p className="font-bold text-slate-700 mb-1">Purchased Items:</p>
                      {sale.items?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.productName} × {item.quantity}</span>
                          <span className="font-medium">₹{item.total}</span>
                        </div>
                      ))}
                      {sale.discount ? (
                        <div className="flex justify-between text-emerald-600 font-semibold pt-1 border-t border-slate-200/60">
                          <span>Discount Applied</span>
                          <span>-₹{sale.discount}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <div className="grid grid-cols-12 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide items-center">
                <div className="col-span-1 flex items-center">
                  <button onClick={handleToggleSelectAll} className="p-1 hover:text-slate-800">
                    {selectedSaleIds.length === filteredSales.length && filteredSales.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <span className="col-span-2">Invoice</span>
                <span className="col-span-3">Customer</span>
                <span className="col-span-2">Items</span>
                <span className="col-span-2">Payment</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

            {filteredSales.map(sale => (
              <div key={sale.id} className="border-b border-slate-50 last:border-0">
                {/* Row */}
                <div
                  className={`grid grid-cols-12 px-5 py-4 cursor-pointer transition-colors items-center ${selectedSaleIds.includes(sale.id) ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'}`}
                  onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                >
                  <div className="col-span-1 flex items-center" onClick={(e) => handleToggleSelectSale(sale.id, e)}>
                    {selectedSaleIds.includes(sale.id) ? (
                      <CheckSquare className="w-4 h-4 text-rose-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                    )}
                  </div>
                  <div className="col-span-2">
                    <p className="font-bold text-slate-800 text-sm">{sale.invoiceNumber || 'N/A'}</p>
                    <p className="text-xs text-slate-400">{new Date(sale.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="col-span-3 font-semibold text-slate-700 text-sm truncate">
                    {sale.customerName || 'Walk-in Customer'}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600 truncate">
                    {sale.items?.length ? `${sale.items.length} item${sale.items.length > 1 ? 's' : ''}` : '1 item'}
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      sale.paymentMethod === 'Cash' ? 'bg-success-50 text-success-700' :
                      sale.paymentMethod === 'UPI' ? 'bg-primary-50 text-primary-700' :
                      sale.paymentMethod === 'Card' ? 'bg-purple-50 text-purple-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {sale.paymentMethod || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleSendBillWhatsApp(sale, e)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100 transition-colors shrink-0"
                      title="Send Bill on WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <span className="font-black text-slate-800">₹{(sale.totalAmount || 0).toLocaleString('en-IN')}</span>
                    {expandedSale === sale.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {expandedSale === sale.id && (
                  <div className="px-5 pb-5 pt-1 bg-slate-50/40 border-t border-slate-100">
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                      {/* Item list */}
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500">Product</th>
                            <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-500">Qty</th>
                            <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500">Rate</th>
                            <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(sale.items || []).map((item, i) => (
                            <tr key={i} className="border-b border-slate-50">
                              <td className="py-2.5 px-4 font-medium text-slate-800">{item.productName}</td>
                              <td className="py-2.5 px-4 text-center text-slate-600">{item.quantity}</td>
                              <td className="py-2.5 px-4 text-right text-slate-600">₹{item.rate.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-800">₹{item.total.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* Totals footer */}
                      <div className="p-4 border-t border-slate-100 space-y-1 text-sm">
                        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{(sale.subtotal || 0).toLocaleString('en-IN')}</span></div>
                        {(sale.discount || 0) > 0 && (
                          <div className="flex justify-between text-success-600"><span>Discount</span><span>- ₹{sale.discount.toLocaleString('en-IN')}</span></div>
                        )}
                        <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t border-slate-100">
                          <span>Total Paid</span>
                          <span>₹{(sale.totalAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
