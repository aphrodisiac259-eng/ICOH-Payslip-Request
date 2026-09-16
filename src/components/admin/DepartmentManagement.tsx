/**
 * ICOH Portal - Department Management
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Department } from '../../types';
import { getDepartments, saveDepartment } from '../../services/firestoreService';
import { logAuditEvent } from '../../services/auditService';
import { Building, Plus, CheckCircle2, Shield } from 'lucide-react';

export const DepartmentManagement: React.FC = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [headOfDept, setHeadOfDept] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const list = await getDepartments();
    setDepartments(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptCode || !deptName) return;

    setSaving(true);
    try {
      const newDept: Department = {
        departmentId: deptCode.trim().toUpperCase(),
        code: deptCode.trim().toUpperCase(),
        name: deptName.trim(),
        description: deptDesc.trim(),
        headOfDepartment: headOfDept.trim() || undefined,
        active: true,
      };

      await saveDepartment(newDept);
      if (user) {
        await logAuditEvent(user.uid, user.email || 'admin', 'department_created', 'departments', newDept.departmentId);
      }
      await loadData();
      setShowAddModal(false);
      setDeptCode('');
      setDeptName('');
      setDeptDesc('');
      setHeadOfDept('');
    } catch (err) {
      alert('Error creating department: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-800" />
            Centre Departments &amp; Units
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional divisions for payslip categorization and access control
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => (
          <div key={d.departmentId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  {d.code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{d.name}</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {d.description || 'Institutional department of the Centre.'}
            </p>

            {d.headOfDepartment && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-600">
                <span className="text-slate-400">Head of Department:</span> {d.headOfDepartment}
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              Create New Department
            </h3>
            <form onSubmit={handleCreate} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CLINICAL, ADMIN, FINANCE"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg uppercase font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Services &amp; Training"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Mandate and functions"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Head of Department (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. Mohammed"
                  value={headOfDept}
                  onChange={(e) => setHeadOfDept(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900"
                >
                  {saving ? 'Creating...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
