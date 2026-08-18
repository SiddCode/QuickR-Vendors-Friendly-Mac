import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { Plus, Trash2 } from 'lucide-react';

interface EnquiriesProps {
  setCurrentPage: (page: string) => void;
  setSelectedCustomerId: (id: string) => void;
}

export const Enquiries: React.FC<EnquiriesProps> = ({ setCurrentPage, setSelectedCustomerId }) => {
  const { enquiries = [], customers = [], products = [], deleteEnquiry } = useApp();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCustomerClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentPage('customer-profile');
  };

  const handleDeleteClick = (e: React.MouseEvent, enquiryId: string) => {
    e.stopPropagation();
    setDeleteId(enquiryId);
  };

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const success = await deleteEnquiry(deleteId);
    setDeleteId(null);
    if (success) {
      setFeedbackMsg('Enquiry and active follow-up deleted successfully');
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const enquiriesList = enquiries || [];

  return (
    <div className="flex-grow p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full font-sans animate-fadeIn">
      {feedbackMsg && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-xl text-sm font-semibold animate-fadeIn">
          {feedbackMsg}
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">All Enquiries</h2>
          <p className="text-xs text-slate-400">View and manage customer clothing requests and purchase statuses</p>
        </div>
        <button
          onClick={() => setCurrentPage('new-enquiry')}
          className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> New Enquiry
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft">
        <div className="overflow-x-auto">
          {enquiriesList.length === 0 ? (
            <p className="text-center text-slate-500 py-4">No enquiries found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-50 pb-2">
                  <th className="py-2.5 text-xs">Customer</th>
                  <th className="py-2.5 text-xs">Product Details</th>
                  <th className="py-2.5 text-xs text-center">Requirement</th>
                  <th className="py-2.5 text-xs text-center">Price</th>
                  <th className="py-2.5 text-xs text-center">Interest</th>
                  <th className="py-2.5 text-xs text-center">Status</th>
                  <th className="py-2.5 text-xs text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {enquiriesList.map((item) => {
                  const customer = customers?.find((c) => c.id === item.customerId);
                  const product = products?.find((p) => p.id === item.productId);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => handleCustomerClick(item.customerId)}
                    >
                      <td className="py-3">
                        <p className="font-bold text-slate-700">{customer?.name || 'Customer'}</p>
                        <p className="text-xs text-slate-400">{customer?.phone}</p>
                      </td>
                      <td className="py-3">
                        <p className="font-bold text-slate-700">{item.productName || product?.name || 'Product'}</p>
                        <p className="text-[10px] text-slate-400">{item.productCategory || product?.category || 'Category'}</p>
                      </td>
                      <td className="py-3 text-center text-xs">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">
                          {item.size} / {item.color}
                        </span>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700 text-sm">
                        ₹{item.priceAtEnquiry || product?.sellingPrice || 0}
                      </td>
                      <td className="py-3 text-center">
                        <StatusBadge status={item.interest} />
                      </td>
                      <td className="py-3 text-center">
                        <StatusBadge status={item.purchaseStatus} />
                      </td>
                      <td className="py-3 text-right pr-4">
                        <button
                          onClick={(e) => handleDeleteClick(e, item.id)}
                          className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Delete Enquiry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-800">Delete this enquiry?</h3>
            <p className="text-sm text-slate-500">
              Active follow-ups will also be removed. Sales history and customer records will be preserved.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-danger-600 hover:bg-danger-700 rounded-xl transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
