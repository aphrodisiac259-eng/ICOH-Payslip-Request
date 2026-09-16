/**
 * ICOH Portal - Payslip Request Form Component
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createPayslipRequest } from '../../services/firestoreService';
import { MONTHS, getMonthName, generateRequestId } from '../../utils/formatting';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import { FilePlus2, CheckCircle2, AlertCircle, Building, User, Calendar, Shield } from 'lucide-react';

interface RequestPayslipFormProps {
  onSuccess: () => void;
}

export const RequestPayslipForm: React.FC<RequestPayslipFormProps> = ({ onSuccess }) => {
  const { user, employeeProfile } = useAuth();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth > 1 ? currentMonth - 1 : 12);
  const [selectedYear, setSelectedYear] = useState<number>(currentMonth > 1 ? currentYear : currentYear - 1);
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRequestId, setSuccessRequestId] = useState<string | null>(null);

  // Generate a preview Request ID
  const [previewRequestId] = useState<string>(generateRequestId(selectedYear));

  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !employeeProfile) {
      setError('Staff session expired. Please sign in again.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const newRequest = await createPayslipRequest({
        requestId: previewRequestId,
        employee: employeeProfile,
        month: Number(selectedMonth),
        year: Number(selectedYear),
        remarks: remarks.trim(),
      });
      setSuccessRequestId(newRequest.requestId);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (successRequestId) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-emerald-200 shadow-md text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 border-2 border-emerald-300">
          <CheckCircle2 className="w-10 h-10 text-emerald-700" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Request Successfully Submitted</h2>
        <p className="text-xs text-slate-500 mt-1">
          Your official payslip issuance requisition has been registered in the ICOH Payroll System.
        </p>

        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Official Reference ID:</span>
            <span className="font-mono font-bold text-emerald-800">{successRequestId}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Requested Period:</span>
            <span className="font-semibold text-slate-800">
              {getMonthName(selectedMonth)} {selectedYear}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Staff Beneficiary:</span>
            <span className="font-semibold text-slate-800">
              {employeeProfile?.fullName} ({employeeProfile?.staffId})
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Department:</span>
            <span className="font-semibold text-slate-800">{employeeProfile?.department}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setSuccessRequestId(null);
              onSuccess();
            }}
            className="px-6 py-2.5 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 transition-colors"
          >
            Track Status in Request History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="bg-emerald-900 text-white p-6 border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 border border-emerald-700 flex items-center justify-center text-emerald-200">
              <FilePlus2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">Submit Payslip Issuance Request</h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                Requisition for official signed and audited monthly salary slip
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Submission Incomplete</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Read-Only Auto-Populated Staff Information */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-700 font-semibold">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-700" />
                Verified Staff Identity (Auto-populated)
              </span>
              <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Ref: {previewRequestId}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">Staff Name:</span>
                <span className="font-medium text-slate-900">{employeeProfile?.fullName || 'Colleague'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Staff ID:</span>
                <span className="font-mono font-medium text-slate-900">{employeeProfile?.staffId || 'ICOH-STAFF'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Department:</span>
                <span className="font-medium text-slate-900">{employeeProfile?.department || 'Centre Department'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Official Email:</span>
                <span className="font-mono text-[11px] text-slate-900">{employeeProfile?.email}</span>
              </div>
            </div>
          </div>

          {/* Month & Year Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="request-month-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payslip Month <span className="text-rose-500">*</span>
              </label>
              <select
                id="request-month-select"
                required
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="block w-full py-2.5 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name} ({String(m.value).padStart(2, '0')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="request-year-select" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Calendar Year <span className="text-rose-500">*</span>
              </label>
              <select
                id="request-year-select"
                required
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="block w-full py-2.5 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="request-remarks-input" className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks or Special Purpose (Optional)
            </label>
            <textarea
              id="request-remarks-input"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Required for bank visa processing, mortgage assessment, or statutory submission..."
              className="block w-full p-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
              maxLength={500}
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">Maximum 500 characters</p>
          </div>

          {/* Regulatory Notice */}
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Upon submission, this request enters the Payroll Division queue. Once verified, the Desk Officer will upload your official certified document for instant download. Duplicate requests for the same month/year are barred to maintain auditing integrity.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="request-payslip-submit-button"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 focus:outline-hidden disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Submitting to Payroll Queue...' : 'Confirm & Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
