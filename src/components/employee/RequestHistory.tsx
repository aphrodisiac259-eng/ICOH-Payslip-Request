/**
 * ICOH Portal - Request History & Timeline Component
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PayslipRequest } from '../../types';
import { subscribeToEmployeeRequests } from '../../services/firestoreService';
import { getMonthName, formatDate, getStatusBadgeClass } from '../../utils/formatting';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  ChevronRight,
  Shield,
  XCircle,
} from 'lucide-react';

interface RequestHistoryProps {
  onNavigateTab: (tab: string) => void;
}

export const RequestHistory: React.FC<RequestHistoryProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PayslipRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToEmployeeRequests(user.uid, (data) => setRequests(data));
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  const getStepState = (currentStatus: string, step: 'submitted' | 'processing' | 'ready' | 'completed') => {
    if (currentStatus === 'Rejected' || currentStatus === 'Cancelled') {
      return 'failed';
    }

    const order = ['Pending', 'Processing', 'Ready', 'Completed'];
    const currentIndex = order.indexOf(currentStatus);

    const stepIndexes = {
      submitted: 0,
      processing: 1,
      ready: 2,
      completed: 3,
    };

    const targetIndex = stepIndexes[step];

    if (currentIndex >= targetIndex) {
      return 'completed';
    }
    if (currentIndex === targetIndex - 1) {
      return 'current';
    }
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-800" />
              Payslip Requisition Timeline & History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track the exact lifecycle progression of your requests through the Payroll Division
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('request')}
            className="self-start sm:self-auto px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors"
          >
            Submit New Request
          </button>
        </div>

        {/* Requests List with interactive timeline cards */}
        <div className="mt-6 space-y-6">
          {requests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700 text-sm">No Requisition History</p>
              <p className="mt-1 text-slate-500">
                You haven't submitted any payslip requests yet. Create a request to start tracking.
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.requestId}
                className="bg-slate-50/50 rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Top Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                      {String(req.month).padStart(2, '0')}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {getMonthName(req.month)} {req.year} Payslip Request
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        Ref: <span className="text-emerald-800 font-semibold">{req.requestId}</span> &bull; Submitted:{' '}
                        {formatDate(req.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusBadgeClass(req.status)}`}>
                      {req.status}
                    </span>
                    {(req.status === 'Ready' || req.status === 'Completed') && (
                      <button
                        onClick={() => onNavigateTab('payslips')}
                        className="px-3 py-1 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900"
                      >
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Lifecycle Stepper */}
                <div className="py-6 px-2">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs relative">
                    {/* Progress line */}
                    <div className="absolute top-4 left-[12%] right-[12%] h-0.5 bg-slate-200 -z-0"></div>

                    {/* Step 1: Submitted */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          getStepState(req.status, 'submitted') === 'completed'
                            ? 'bg-emerald-700 text-white ring-4 ring-emerald-100'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        ✓
                      </div>
                      <span className="font-semibold text-slate-800 mt-2 text-[11px]">Submitted</span>
                      <span className="text-[10px] text-slate-400">{formatDate(req.submittedAt)}</span>
                    </div>

                    {/* Step 2: Under Processing */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          getStepState(req.status, 'processing') === 'completed'
                            ? 'bg-emerald-700 text-white ring-4 ring-emerald-100'
                            : req.status === 'Processing'
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                            : req.status === 'Rejected'
                            ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {req.status === 'Rejected' ? '✕' : '2'}
                      </div>
                      <span className="font-semibold text-slate-800 mt-2 text-[11px]">Desk Review</span>
                      <span className="text-[10px] text-slate-400">
                        {req.processedAt ? formatDate(req.processedAt) : 'Pending Review'}
                      </span>
                    </div>

                    {/* Step 3: Ready */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          getStepState(req.status, 'ready') === 'completed' || req.status === 'Ready'
                            ? 'bg-emerald-700 text-white ring-4 ring-emerald-100'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        3
                      </div>
                      <span className="font-semibold text-slate-800 mt-2 text-[11px]">PDF Certified</span>
                      <span className="text-[10px] text-slate-400">
                        {req.completedAt ? formatDate(req.completedAt) : 'Officer Signature'}
                      </span>
                    </div>

                    {/* Step 4: Completed */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          req.status === 'Completed'
                            ? 'bg-emerald-700 text-white ring-4 ring-emerald-100'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        4
                      </div>
                      <span className="font-semibold text-slate-800 mt-2 text-[11px]">Issued</span>
                      <span className="text-[10px] text-slate-400">
                        {req.status === 'Completed' ? 'Downloaded' : 'Awaiting Access'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Details, Remarks, Officer Feedback */}
                {(req.remarks || req.rejectionReason || req.internalNotes) && (
                  <div className="mt-2 pt-3 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {req.remarks && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200/70">
                        <span className="font-semibold text-slate-600 block text-[11px]">Your Remarks:</span>
                        <p className="text-slate-800 mt-0.5">{req.remarks}</p>
                      </div>
                    )}

                    {req.rejectionReason && (
                      <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900">
                        <span className="font-semibold text-rose-800 block text-[11px] flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Rejection Reason from Payroll Desk:
                        </span>
                        <p className="mt-0.5">{req.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
