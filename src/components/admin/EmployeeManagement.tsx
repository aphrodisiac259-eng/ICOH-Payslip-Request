/**
 * ICOH Portal - Employee Management & Provisioning
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Employee, Department } from '../../types';
import {
  subscribeToAllEmployees,
  saveEmployeeRecord,
  getDepartments,
  getEmployeeRequests,
  getEmployeePayslips,
} from '../../services/firestoreService';
import { registerEmployeeWithCredentials } from '../../services/authService';
import { logAuditEvent } from '../../services/auditService';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import { formatDate } from '../../utils/formatting';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  KeyRound,
  Shield,
  Building,
  RotateCcw,
  FileText,
} from 'lucide-react';

export const EmployeeManagement: React.FC = () => {
  const { user, isSuperAdmin, isPayrollOfficer } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingHistoryEmployee, setViewingHistoryEmployee] = useState<Employee | null>(null);

  // New employee form
  const [fullName, setFullName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [unit, setUnit] = useState('');
  const [designation, setDesignation] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<'Permanent' | 'Contract' | 'Probation'>('Permanent');
  const [tempPassword, setTempPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllEmployees((data) => setEmployees(data));
    getDepartments().then((depts) => {
      setDepartments(depts);
      if (depts.length > 0) setDepartment(depts[0].name);
    }).catch(console.warn);

    return () => {
      if (unsub) unsub();
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchDept = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchStatus = statusFilter === 'all' || emp.accountStatus === statusFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === '' ||
        emp.fullName.toLowerCase().includes(q) ||
        emp.staffId.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);

      return matchDept && matchStatus && matchSearch;
    });
  }, [employees, departmentFilter, statusFilter, searchTerm]);

  // Handle employee creation
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreateError(null);
    setCreateSuccess(null);
    setCreating(true);

    try {
      const newEmp = await registerEmployeeWithCredentials({
        staffId: staffId.trim().toUpperCase(),
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        department: department || 'General Administration',
        unit: unit.trim(),
        designation: designation.trim(),
        employmentStatus,
        temporaryPassword: tempPassword,
        adminUID: user.uid,
        adminEmail: user.email || 'admin@icoh.org.ng',
      });

      setCreateSuccess(`Employee ${newEmp.fullName} (${newEmp.staffId}) provisioned successfully!`);
      // Reset form
      setFullName('');
      setStaffId('');
      setEmail('');
      setUnit('');
      setDesignation('');
      setTempPassword('');
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateSuccess(null);
      }, 2000);
    } catch (err) {
      setCreateError(getFriendlyErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  // Toggle active/inactive
  const handleToggleStatus = async (emp: Employee) => {
    if (!user) return;
    const newStatus = emp.accountStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await saveEmployeeRecord(
        { ...emp, accountStatus: newStatus },
        user.uid,
        user.email || 'admin@icoh.org.ng'
      );
      await logAuditEvent(
        user.uid,
        user.email || 'admin',
        'employee_status_toggled',
        'employees',
        emp.uid,
        { previous: emp.accountStatus, next: newStatus }
      );
    } catch (err) {
      alert(getFriendlyErrorMessage(err));
    }
  };

  // Force first-login password reset
  const handleRequirePasswordReset = async (emp: Employee) => {
    if (!user) return;
    if (!confirm(`Require ${emp.fullName} to change password upon next login?`)) return;

    try {
      await saveEmployeeRecord(
        { ...emp, firstLoginComplete: false },
        user.uid,
        user.email || 'admin@icoh.org.ng'
      );
      alert(`Password change requirement enforced for ${emp.fullName}.`);
    } catch (err) {
      alert(getFriendlyErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-800" />
              Institutional Staff Roster &amp; Provisioning
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage staff accounts, provision new hires, and enforce role-based security
            </p>
          </div>

          <button
            id="admin-create-employee-button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 flex items-center gap-2 shadow-sm self-start sm:self-auto transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Provision New Employee
          </button>
        </div>

        {/* Filter bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              id="admin-employees-search-input"
              type="text"
              placeholder="Search Staff ID, Name, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
            />
          </div>

          <div>
            <select
              id="admin-employees-filter-department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.departmentId} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              id="admin-employees-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No Employees Found</p>
            <p className="mt-1 text-slate-500">Provision your first employee using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3.5 text-left">Staff Member</th>
                  <th className="px-6 py-3.5 text-left">Staff ID</th>
                  <th className="px-6 py-3.5 text-left">Department &amp; Unit</th>
                  <th className="px-6 py-3.5 text-left">Cadre</th>
                  <th className="px-6 py-3.5 text-left">First Login</th>
                  <th className="px-6 py-3.5 text-left">Account Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.uid} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{emp.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-emerald-800">
                      {emp.staffId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-slate-800 font-medium">{emp.department}</div>
                      <div className="text-[11px] text-slate-500">{emp.unit || emp.designation || 'General'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {emp.employmentStatus}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.firstLoginComplete ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                          Complete
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold animate-pulse">
                          Pending First Change
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.accountStatus === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {emp.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`p-1.5 rounded-lg text-xs font-semibold ${
                          emp.accountStatus === 'Active'
                            ? 'text-rose-600 hover:bg-rose-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={emp.accountStatus === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                      >
                        {emp.accountStatus === 'Active' ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => handleRequirePasswordReset(emp)}
                        className="p-1.5 text-slate-600 hover:text-emerald-800 rounded-lg hover:bg-slate-100"
                        title="Require Password Reset on Next Login"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Employee Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Provision Employee Account</h3>
                  <p className="text-xs text-slate-500">Register verified staff credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {createError}
              </div>
            )}

            {createSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Staff ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Staff ID (e.g. ICOH-EMP-012)"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Ngozi Adebayo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. n.adebayo@icoh.org.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.departmentId} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit / Section</label>
                  <input
                    type="text"
                    placeholder="e.g. Clinical Operative Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Dental Surgeon"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Cadre</label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Probation">Probation</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Temporary Default Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter initial temporary password (min 8 characters)"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Employee will be forced to change this immediately on their first login.
                  </span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
                >
                  {creating ? 'Registering Staff...' : 'Create Employee Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
