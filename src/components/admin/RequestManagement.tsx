/**
 * ICOH Portal - Payslip Request Management Queue
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PayslipRequest, PayslipStatus, Payslip } from '../../types';
import {
  subscribeToAllRequests,
  updateRequestStatus,
  getDepartments,
} from '../../services/firestoreService';
import { getMonthName, formatDate, formatShortDate, getStatusBadgeClass, MONTHS } from '../../utils/formatting';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import { PayslipUploadModal } from './PayslipUploadModal';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Eye,
  FileText,
  User,
  Building,
  RotateCcw,
  XCircle,
} from 'lucide-react';

interface RequestManagementProps {
  initialSelectedRequest?: PayslipRequest | null;
  onClearInitialRequest?: () => void;
}

export const RequestManagement: React.FC<RequestManagementProps> = ({
  initialSelectedRequest,
  onClearInitialRequest,
}) => {
  const { user, adminProfile } = useAuth();
  const [requests, setRequests] = useState<PayslipRequest[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Active modal state
  const [activeRequest, setActiveRequest] = useState<PayslipRequest | null>(initialSelectedRequest || null);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isReplacement, setIsReplacement] = useState<boolean>(false);

  // Status update inputs inside modal
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllRequests((data) => {
      setRequests(data);
      // Keep activeRequest in sync if updated
      if (activeRequest) {
        const fresh = data.find((r) => r.requestId === activeRequest.requestId);
        if (fresh) setActiveRequest(fresh);
      }
    });

    getDepartments()
      .then((d) => setDepartments(d.map((x) => ({ id: x.departmentId, name: x.name }))))
      .catch(console.warn);

    return () => {
      if (unsub) unsub();
    };
  }, [activeRequest?.requestId]);

  useEffect(() => {
    if (initialSelectedRequest) {
      setActiveRequest(initialSelectedRequest);
      setInternalNotes(initialSelectedRequest.internalNotes || '');
      setRejectionReason(initialSelectedRequest.rejectionReason || '');
    }
  }, [initialSelectedRequest]);

  // Available Years
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    requests.forEach((r) => set.add(r.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [requests]);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchDept = departmentFilter === 'all' || r.department === departmentFilter;
      const matchYear = yearFilter === 'all' || r.year === Number(yearFilter);
      const matchMonth = monthFilter === 'all' || r.month === Number(monthFilter);

      const q = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === '' ||
        r.requestId.toLowerCase().includes(q) ||
        r.employeeName.toLowerCase().includes(q) ||
        r.staffId.toLowerCase().includes(q) ||
        (r.remarks && r.remarks.toLowerCase().includes(q));

      return matchStatus && matchDept && matchYear && matchMonth && matchSearch;
    });
  }, [requests, statusFilter, departmentFilter, yearFilter, monthFilter, searchTerm]);

  // Handle status update
  const handleUpdateStatus = async (newStatus: PayslipStatus) => {
    if (!activeRequest || !user) return;
    setUpdatingStatus(true);
    setModalFeedback(null);

    try {
      await updateRequestStatus({
        requestId: activeRequest.requestId,
        status: newStatus,
        actorUID: user.uid,
        actorName: adminProfile?.fullName || user.displayName || 'Payroll Officer',
        actorEmail: user.email || 'payroll@icoh.org.ng',
        internalNotes: internalNotes.trim(),
        rejectionReason: newStatus === 'Rejected' ? rejectionReason.trim() : undefined,
      });

      setModalFeedback(`Request status changed to ${newStatus}`);
      setTimeout(() => setModalFeedback(null), 3000);
    } catch (err) {
      setModalFeedback(getFriendlyErrorMessage(err));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOpenDetailModal = (req: PayslipRequest) => {
    setActiveRequest(req);
    setInternalNotes(req.internalNotes || '');
    setRejectionReason(req.rejectionReason || '');
    setModalFeedback(null);
  };

  const handleCloseDetailModal = () => {
    setActiveRequest(null);
    if (onClearInitialRequest) onClearInitialRequest();
  };

  return (
    <div className="space-y-6">
      {/* Control Header & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-800" />
              Payslip Requisition Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review staff submissions, update processing status, and certify monthly payslips
            </p>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-xl">
            {['all', 'Pending', 'Processing', 'Ready', 'Completed', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All' : st}
                <span className="ml-1.5 text-[10px] opacity-70">
                  (
                  {st === 'all'
                    ? requests.length
                    : requests.filter((r) => r.status === st).length}
                  )
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search & Secondary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="admin-requests-search-input"
              type="text"
              placeholder="Search Staff ID, Name, Ref ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
            />
          </div>

          <div>
            <select
              id="admin-requests-filter-department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="admin-requests-filter-year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="admin-requests-filter-month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Months</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No Requisitions Found</p>
            <p className="mt-1 text-slate-500">No requests match your selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5 text-left">Request Ref</th>
                  <th className="px-6 py-3.5 text-left">Employee Beneficiary</th>
                  <th className="px-6 py-3.5 text-left">Department</th>
                  <th className="px-6 py-3.5 text-left">Target Period</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Submission Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRequests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {req.requestId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{req.employeeName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ID: {req.staffId}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{req.department}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                      {getMonthName(req.month)} {req.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(req.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetailModal(req)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>

                      {req.status !== 'Ready' && req.status !== 'Completed' && (
                        <button
                          onClick={() => {
                            setActiveRequest(req);
                            setIsReplacement(false);
                            setShowUploadModal(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Request Drawer / Modal */}
      {activeRequest && !showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-800" />
                  Request Details &amp; Processing
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Ref: <span className="font-bold text-emerald-800">{activeRequest.requestId}</span>
                </p>
              </div>
              <button onClick={handleCloseDetailModal} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            {modalFeedback && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
                {modalFeedback}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {/* Employee Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[11px]">Employee Name:</span>
                  <span className="font-bold text-slate-900">{activeRequest.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Staff ID:</span>
                  <span className="font-mono font-bold text-slate-900">{activeRequest.staffId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Department:</span>
                  <span className="font-medium text-slate-700">{activeRequest.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Requested Period:</span>
                  <span className="font-bold text-emerald-800">
                    {getMonthName(activeRequest.month)} {activeRequest.year}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[11px]">Staff Remarks / Stated Purpose:</span>
                  <span className="font-normal text-slate-700 italic">
                    {activeRequest.remarks || 'No special remarks provided by employee.'}
                  </span>
                </div>
              </div>

              {/* Status Change & Workflow Operations */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Current Status:</span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusBadgeClass(activeRequest.status)}`}>
                    {activeRequest.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {activeRequest.status === 'Pending' && (
                    <button
                      onClick={() => handleUpdateStatus('Processing')}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 text-xs"
                    >
                      Mark as Under Processing
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsReplacement(activeRequest.status === 'Ready' || activeRequest.status === 'Completed');
                      setShowUploadModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg font-semibold hover:bg-emerald-900 text-xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {activeRequest.status === 'Ready' || activeRequest.status === 'Completed'
                      ? 'Re-upload / Replace Payslip'
                      : 'Upload Payslip PDF'}
                  </button>

                  {activeRequest.status !== 'Rejected' && (
                    <button
                      onClick={() => {
                        if (!rejectionReason.trim()) {
                          alert('Please enter a rejection reason below before disallowing this request.');
                          return;
                        }
                        handleUpdateStatus('Rejected');
                      }}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 text-xs flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject Request
                    </button>
                  )}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Payroll Notes (Officer Log)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record internal verification notes or salary adjustments..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Rejection Reason Input */}
              {activeRequest.status !== 'Rejected' && (
                <div>
                  <label className="block text-xs font-semibold text-rose-800 mb-1">
                    Rejection Reason (Dispatched to employee if rejected)
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Period requested prior to official engagement date..."
                    className="w-full p-2.5 text-xs border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 bg-rose-50/30"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleCloseDetailModal}
                className="px-5 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && activeRequest && (
        <PayslipUploadModal
          request={activeRequest}
          isOpen={showUploadModal}
          isReplacement={isReplacement}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(payslip) => {
            setShowUploadModal(false);
            setModalFeedback(`Payslip uploaded and certified! (File: ${payslip.fileName})`);
          }}
        />
      )}
    </div>
  );
};
