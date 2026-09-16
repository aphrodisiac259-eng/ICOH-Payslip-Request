/**
 * ICOH Portal - Employee Dashboard View
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PayslipRequest, Payslip } from '../../types';
import { subscribeToEmployeeRequests, subscribeToEmployeePayslips } from '../../services/firestoreService';
import { downloadPayslip } from '../../services/storageService';
import { getMonthName, formatDate, formatShortDate, getStatusBadgeClass, formatFileSize } from '../../utils/formatting';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  PlusCircle,
  ArrowRight,
  Shield,
  Building,
} from 'lucide-react';

interface EmployeeDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigateTab }) => {
  const { user, employeeProfile } = useAuth();
  const [requests, setRequests] = useState<PayslipRequest[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubRequests = subscribeToEmployeeRequests(user.uid, (data) => setRequests(data));
    const unsubPayslips = subscribeToEmployeePayslips(user.uid, (data) => setPayslips(data));

    return () => {
      if (unsubRequests) unsubRequests();
      if (unsubPayslips) unsubPayslips();
    };
  }, [user]);

  const pendingCount = requests.filter((r) => r.status === 'Pending' || r.status === 'Processing').length;
  const readyCount = requests.filter((r) => r.status === 'Ready' || r.status === 'Completed').length;

  const handleDownload = async (payslip: Payslip) => {
    if (!user) return;
    setDownloadingId(payslip.payslipId);
    try {
      await downloadPayslip(payslip, user.uid, user.email || 'employee');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not download payslip');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" />
              <span>{employeeProfile?.department || 'Centre Staff'}</span>
              <span>&bull;</span>
              <span>ID: {employeeProfile?.staffId || 'ICOH-STAFF'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Welcome back, {employeeProfile?.fullName || user?.displayName || 'Colleague'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-xl">
              Access your official monthly payslips, track processing progression with the Payroll Division, and submit new payslip issuance requests securely.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              id="emp-dashboard-request-button"
              onClick={() => onNavigateTab('request')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-900 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              Request New Payslip
            </button>
            <button
              id="emp-dashboard-payslips-button"
              onClick={() => onNavigateTab('payslips')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700/60 text-white font-semibold rounded-xl text-xs hover:bg-emerald-700 transition-colors border border-emerald-500/40"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              My Payslip Library
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Requests</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Submitted by you</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Available Payslips</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{payslips.length}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Ready for download</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Under Processing</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Desk review active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Account Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <p className="text-base font-bold text-slate-900">{employeeProfile?.accountStatus || 'Active'}</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Verified Institutional Staff</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Payslips Ready & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Available Payslips */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Latest Available Payslips
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Download your official payslip documents</p>
            </div>
            <button
              onClick={() => onNavigateTab('payslips')}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {payslips.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No payslips uploaded yet.</p>
                <p className="mt-1">Submit a request to receive your monthly document.</p>
              </div>
            ) : (
              payslips.slice(0, 4).map((ps) => (
                <div
                  key={ps.payslipId}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {getMonthName(ps.month)} {ps.year} Payslip
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Ref: {ps.requestId} &bull; {formatFileSize(ps.fileSize)}
                      </p>
                    </div>
                  </div>

                  <button
                    id={`download-payslip-${ps.payslipId}`}
                    onClick={() => handleDownload(ps)}
                    disabled={downloadingId === ps.payslipId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white hover:bg-emerald-900 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloadingId === ps.payslipId ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Request Status Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700" />
                Recent Payslip Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Real-time status tracking with Payroll Desk</p>
            </div>
            <button
              onClick={() => onNavigateTab('history')}
              className="text-xs text-emerald-800 hover:text-emerald-950 font-semibold flex items-center gap-1"
            >
              Full History <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>No active requests.</p>
                <button
                  onClick={() => onNavigateTab('request')}
                  className="mt-2 text-emerald-800 font-bold underline"
                >
                  Create your first request
                </button>
              </div>
            ) : (
              requests.slice(0, 4).map((req) => (
                <div
                  key={req.requestId}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {getMonthName(req.month)} {req.year}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadgeClass(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {req.requestId} &bull; Submitted {formatShortDate(req.createdAt)}
                    </p>
                  </div>

                  {req.status === 'Ready' && (
                    <button
                      onClick={() => onNavigateTab('payslips')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                    >
                      Get File
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
