/**
 * ICOH Portal - My Payslips Library
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Payslip } from '../../types';
import { subscribeToEmployeePayslips } from '../../services/firestoreService';
import { downloadPayslip, getPayslipBlobUrl } from '../../services/storageService';
import { getMonthName, formatDate, formatFileSize, MONTHS } from '../../utils/formatting';
import {
  FileText,
  Download,
  Search,
  Filter,
  Calendar,
  Eye,
  ShieldCheck,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export const MyPayslips: React.FC = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewPayslip, setPreviewPayslip] = useState<Payslip | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToEmployeePayslips(user.uid, (items) => setPayslips(items));
    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // Clean up any preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Distinct available years
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    payslips.forEach((p) => set.add(p.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [payslips]);

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        p.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getMonthName(p.month).toLowerCase().includes(searchTerm.toLowerCase());

      const matchYear = filterYear === 'all' || p.year === Number(filterYear);
      const matchMonth = filterMonth === 'all' || p.month === Number(filterMonth);

      return matchSearch && matchYear && matchMonth;
    });
  }, [payslips, searchTerm, filterYear, filterMonth]);

  const handleDownload = async (payslip: Payslip) => {
    if (!user) return;
    setDownloadingId(payslip.payslipId);
    try {
      await downloadPayslip(payslip, user.uid, user.email || 'employee');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not download document.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenPreview = async (payslip: Payslip) => {
    if (!user) return;
    setPreviewLoadingId(payslip.payslipId);
    try {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      const url = await getPayslipBlobUrl(payslip, user.uid);
      setPreviewUrl(url);
      setPreviewPayslip(payslip);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not preview document.');
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewPayslip(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-800" />
              Official Payslip Library
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Certified digital payslips issued and stamped by the ICOH Payroll Desk
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 self-start md:self-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Strictly isolated &bull; End-to-end encrypted</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="payslip-library-search-input"
              type="text"
              placeholder="Search reference ID or month..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              id="payslip-library-filter-year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Available Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="payslip-library-filter-month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
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

      {/* Payslips Table / Card Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredPayslips.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs px-4">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">No Payslips Found</p>
            <p className="mt-1 max-w-sm mx-auto text-slate-500">
              {payslips.length === 0
                ? "You haven't had any payslips uploaded by the Payroll Desk yet. Please submit a request to receive your certified payslip."
                : 'No payslips match your current search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5 text-left">Payslip Period</th>
                  <th className="px-6 py-3.5 text-left">Request Reference</th>
                  <th className="px-6 py-3.5 text-left">Uploaded Date</th>
                  <th className="px-6 py-3.5 text-left">File Size</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPayslips.map((p) => (
                  <tr key={p.payslipId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                        PDF
                      </div>
                      <span>
                        {getMonthName(p.month)} {p.year}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-emerald-800 font-medium">
                      {p.requestId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {formatDate(p.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {formatFileSize(p.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Certified
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleOpenPreview(p)}
                        disabled={previewLoadingId === p.payslipId}
                        className="p-1.5 text-slate-500 hover:text-emerald-800 rounded hover:bg-slate-100 disabled:opacity-50 inline-flex items-center"
                        title="Preview Document"
                      >
                        {previewLoadingId === p.payslipId ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-800" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        id={`library-download-button-${p.payslipId}`}
                        onClick={() => handleDownload(p)}
                        disabled={downloadingId === p.payslipId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white hover:bg-emerald-900 transition-colors shadow-xs disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {downloadingId === p.payslipId ? 'Downloading...' : 'Download PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewPayslip && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Document Preview: {getMonthName(previewPayslip.month)} {previewPayslip.year} Payslip
                </h3>
                <p className="text-xs text-emerald-300 font-mono">Ref: {previewPayslip.requestId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewPayslip)}
                  className="px-3 py-1.5 bg-white text-emerald-900 rounded text-xs font-bold hover:bg-emerald-50 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  onClick={handleClosePreview}
                  className="text-white hover:text-rose-200 text-xl font-bold px-2"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={previewUrl}
                title="Payslip Preview"
                className="w-full h-full rounded border border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
