/**
 * ICOH Portal - Analytics, Breakdown & CSV Export
 */

import React, { useEffect, useState, useMemo } from 'react';
import { PayslipRequest } from '../../types';
import { subscribeToAllRequests } from '../../services/firestoreService';
import { getMonthName, formatDate, formatShortDate } from '../../utils/formatting';
import {
  BarChart3,
  Download,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [requests, setRequests] = useState<PayslipRequest[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const unsub = subscribeToAllRequests((data) => setRequests(data));
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Filter requests for selected year
  const yearRequests = useMemo(() => {
    return requests.filter((r) => r.year === selectedYear);
  }, [requests, selectedYear]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return months.map((m) => {
      const inMonth = yearRequests.filter((r) => r.month === m);
      return {
        month: m,
        name: getMonthName(m),
        total: inMonth.length,
        ready: inMonth.filter((r) => r.status === 'Ready' || r.status === 'Completed').length,
        pending: inMonth.filter((r) => r.status === 'Pending' || r.status === 'Processing').length,
        rejected: inMonth.filter((r) => r.status === 'Rejected').length,
      };
    });
  }, [yearRequests]);

  // Department stats
  const departmentStats = useMemo(() => {
    const map: Record<string, { total: number; ready: number; pending: number; rejected: number }> = {};
    yearRequests.forEach((r) => {
      const dept = r.department || 'Unassigned';
      if (!map[dept]) {
        map[dept] = { total: 0, ready: 0, pending: 0, rejected: 0 };
      }
      map[dept].total += 1;
      if (r.status === 'Ready' || r.status === 'Completed') map[dept].ready += 1;
      else if (r.status === 'Pending' || r.status === 'Processing') map[dept].pending += 1;
      else if (r.status === 'Rejected') map[dept].rejected += 1;
    });

    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [yearRequests]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Request ID',
      'Staff ID',
      'Employee Name',
      'Department',
      'Month',
      'Year',
      'Status',
      'Submitted At',
      'Processed At',
      'Completed At',
      'Remarks',
      'Rejection Reason',
    ];

    const rows = yearRequests.map((r) => [
      `"${r.requestId}"`,
      `"${r.staffId}"`,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      `"${getMonthName(r.month)}"`,
      r.year,
      `"${r.status}"`,
      `"${r.createdAt}"`,
      `"${r.processedAt || ''}"`,
      `"${r.completedAt || ''}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
      `"${(r.rejectionReason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ICOH_Payslip_Requisitions_Report_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-800" />
            Payroll Requisition Audit Reports &amp; Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional monthly volume breakdown and certified data exports
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
          >
            {[2026, 2025, 2024, 2023].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          <button
            id="export-reports-csv-button"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* High-level year summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Year {selectedYear} Requests</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{yearRequests.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <p className="text-xs font-medium text-emerald-700">Issued &amp; Certified</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">
            {yearRequests.filter((r) => r.status === 'Ready' || r.status === 'Completed').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <p className="text-xs font-medium text-amber-700">In Desk Queue</p>
          <p className="text-2xl font-black text-amber-800 mt-1">
            {yearRequests.filter((r) => r.status === 'Pending' || r.status === 'Processing').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <p className="text-xs font-medium text-rose-700">Disallowed / Rejected</p>
          <p className="text-2xl font-black text-rose-800 mt-1">
            {yearRequests.filter((r) => r.status === 'Rejected').length}
          </p>
        </div>
      </div>

      {/* Monthly distribution table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Monthly Requisition Distribution ({selectedYear})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="px-6 py-3 text-left">Month</th>
                <th className="px-6 py-3 text-center">Total Requests</th>
                <th className="px-6 py-3 text-center">Issued / Ready</th>
                <th className="px-6 py-3 text-center">In Desk Queue</th>
                <th className="px-6 py-3 text-center">Rejected</th>
                <th className="px-6 py-3 text-left">Fulfillment Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {monthlyStats.map((m) => {
                const rate = m.total > 0 ? Math.round((m.ready / m.total) * 100) : 100;
                return (
                  <tr key={m.month} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{m.name}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-slate-800">{m.total}</td>
                    <td className="px-6 py-3.5 text-center text-emerald-700 font-semibold">{m.ready}</td>
                    <td className="px-6 py-3.5 text-center text-amber-700 font-semibold">{m.pending}</td>
                    <td className="px-6 py-3.5 text-center text-rose-700 font-semibold">{m.rejected}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-700 h-full rounded-full" style={{ width: `${rate}%` }}></div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department Breakdown table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Departmental Volume Breakdown ({selectedYear})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="px-6 py-3 text-left">Department</th>
                <th className="px-6 py-3 text-center">Total Volume</th>
                <th className="px-6 py-3 text-center">Certified</th>
                <th className="px-6 py-3 text-center">Pending</th>
                <th className="px-6 py-3 text-center">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {departmentStats.map(([dept, s]) => (
                <tr key={dept} className="hover:bg-slate-50">
                  <td className="px-6 py-3.5 font-bold text-slate-900">{dept}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-slate-800">{s.total}</td>
                  <td className="px-6 py-3.5 text-center text-emerald-700 font-semibold">{s.ready}</td>
                  <td className="px-6 py-3.5 text-center text-amber-700 font-semibold">{s.pending}</td>
                  <td className="px-6 py-3.5 text-center text-rose-700 font-semibold">{s.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
