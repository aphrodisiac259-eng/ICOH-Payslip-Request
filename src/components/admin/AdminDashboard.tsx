/**
 * ICOH Portal - Admin & Payroll Desk Dashboard
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PayslipRequest, Employee, Department } from '../../types';
import {
  subscribeToAllRequests,
  subscribeToAllEmployees,
  getDepartments,
} from '../../services/firestoreService';
import { getMonthName, formatDate, formatShortDate, getStatusBadgeClass } from '../../utils/formatting';
import {
  Users,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  ArrowRight,
  TrendingUp,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenRequest: (req: PayslipRequest) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onOpenRequest,
}) => {
  const { isSuperAdmin, isPayrollOfficer, adminProfile } = useAuth();
  const [requests, setRequests] = useState<PayslipRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const unsubReq = subscribeToAllRequests((data) => setRequests(data));
    const unsubEmp = subscribeToAllEmployees((data) => setEmployees(data));
    getDepartments().then((depts) => setDepartments(depts)).catch(console.warn);

    return () => {
      if (unsubReq) unsubReq();
      if (unsubEmp) unsubEmp();
    };
  }, []);

  // Stats calculation
  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'Pending').length, [requests]);
  const processingCount = useMemo(() => requests.filter((r) => r.status === 'Processing').length, [requests]);
  const readyCount = useMemo(() => requests.filter((r) => r.status === 'Ready').length, [requests]);
  const completedCount = useMemo(() => requests.filter((r) => r.status === 'Completed').length, [requests]);
  const rejectedCount = useMemo(() => requests.filter((r) => r.status === 'Rejected').length, [requests]);

  // Current Month vs Previous Month breakdown
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const currentMonthRequests = useMemo(
    () => requests.filter((r) => r.month === currentMonth && r.year === currentYear).length,
    [requests, currentMonth, currentYear]
  );

  const prevMonthRequests = useMemo(
    () => requests.filter((r) => r.month === prevMonth && r.year === prevYear).length,
    [requests, prevMonth, prevYear]
  );

  // Department distribution
  const departmentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    requests.forEach((r) => {
      const dept = r.department || 'Unassigned';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-emerald-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-emerald-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>{isSuperAdmin ? 'Super Administrator Console' : 'Payroll Desk Officer Workstation'}</span>
            <span>&bull;</span>
            <span className="font-mono">ID: {adminProfile?.adminId || 'OFFICER'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Payroll Operations &amp; Issuance Console
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl">
            Authorize monthly employee payslips, review requisition requests, process certified PDF uploads, and audit institutional disbursement requests.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            id="admin-dash-view-requests-button"
            onClick={() => onNavigateTab('admin-requests')}
            className="px-4 py-2.5 bg-white text-emerald-950 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-emerald-800" />
            Manage Queue ({pendingCount + processingCount})
          </button>
          <button
            id="admin-dash-employees-button"
            onClick={() => onNavigateTab('admin-employees')}
            className="px-4 py-2.5 bg-emerald-800 text-emerald-100 font-semibold rounded-xl text-xs hover:bg-emerald-700 transition-colors border border-emerald-700 flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-emerald-300" />
            Employee Directory ({employees.length})
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Employees</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{employees.length}</p>
          <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Active Staff Roster</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
          <p className="text-[11px] font-semibold text-blue-700 uppercase">Pending Review</p>
          <p className="text-2xl font-black text-blue-800 mt-1">{pendingCount}</p>
          <p className="text-[10px] text-blue-600 font-medium mt-0.5">Awaiting Processing</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <p className="text-[11px] font-semibold text-amber-700 uppercase">In Processing</p>
          <p className="text-2xl font-black text-amber-800 mt-1">{processingCount}</p>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Desk Officer Assigned</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase">Ready For Download</p>
          <p className="text-2xl font-black text-emerald-800 mt-1">{readyCount}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">PDF Certified</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-600 uppercase">Completed</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{completedCount}</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Downloaded by Staff</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <p className="text-[11px] font-semibold text-rose-700 uppercase">Rejected</p>
          <p className="text-2xl font-black text-rose-800 mt-1">{rejectedCount}</p>
          <p className="text-[10px] text-rose-600 font-medium mt-0.5">Requisition Disallowed</p>
        </div>
      </div>

      {/* Month Breakdown & Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month-over-Month Comparison */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              Volume Comparison
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Monthly requests submitted across the Centre:
            </p>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700">
                    Current Period ({getMonthName(currentMonth)} {currentYear})
                  </span>
                  <p className="text-xs text-slate-500">Active billing cycle requests</p>
                </div>
                <span className="text-xl font-black text-emerald-800">{currentMonthRequests}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700">
                    Prior Period ({getMonthName(prevMonth)} {prevYear})
                  </span>
                  <p className="text-xs text-slate-500">Previous cycle requests</p>
                </div>
                <span className="text-xl font-bold text-slate-700">{prevMonthRequests}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total All-Time Requests:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{requests.length}</span>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-700" />
              Requests by Centre Department
            </h3>
            <span className="text-xs text-slate-400 font-medium">{departmentCounts.length} Active Departments</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {departmentCounts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No departmental data available yet.</p>
            ) : (
              departmentCounts.slice(0, 5).map(([dept, count]) => {
                const percentage = requests.length > 0 ? Math.round((count / requests.length) * 100) : 0;
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-xs">{dept}</span>
                      <span className="text-slate-500 font-mono">
                        {count} req ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Pending Queue Priority Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Pending Payroll Action Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Requests needing officer review and PDF upload</p>
          </div>
          <button
            onClick={() => onNavigateTab('admin-requests')}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
          >
            View Full Queue ({requests.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {requests.filter((r) => r.status === 'Pending' || r.status === 'Processing').length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="font-bold text-slate-700 text-sm">Action Queue is Clear</p>
              <p className="mt-1">All employee payslip requests have been certified or processed.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3 text-left">Request Ref</th>
                  <th className="px-6 py-3 text-left">Staff Beneficiary</th>
                  <th className="px-6 py-3 text-left">Department</th>
                  <th className="px-6 py-3 text-left">Requested Period</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Submitted Date</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {requests
                  .filter((r) => r.status === 'Pending' || r.status === 'Processing')
                  .slice(0, 5)
                  .map((req) => (
                    <tr key={req.requestId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {req.requestId}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{req.employeeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">ID: {req.staffId}</div>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 whitespace-nowrap">{req.department}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                        {getMonthName(req.month)} {req.year}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeClass(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">{formatShortDate(req.createdAt)}</td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenRequest(req)}
                          className="px-3 py-1 bg-emerald-800 text-white rounded text-xs font-semibold hover:bg-emerald-900 transition-colors"
                        >
                          Process &amp; Upload
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
