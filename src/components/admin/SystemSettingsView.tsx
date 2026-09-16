/**
 * ICOH Portal - System Settings View
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Settings, CheckCircle2, Save } from 'lucide-react';

export const SystemSettingsView: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [orgName, setOrgName] = useState('Intercountry Centre for Oral Health (ICOH) for Africa, Jos');
  const [maxFileSizeMB, setMaxFileSizeMB] = useState('10');
  const [supportEmail, setSupportEmail] = useState('payroll@icoh.org.ng');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">System &amp; Institutional Governance Settings</h2>
            <p className="text-xs text-slate-500">Global payroll rules, storage limits, and institutional configurations</p>
          </div>
        </div>

        {saved && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Official Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Payroll Support Email
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Maximum Payslip PDF Upload Size (MB)
            </label>
            <input
              type="number"
              min="1"
              max="25"
              value={maxFileSizeMB}
              onChange={(e) => setMaxFileSizeMB(e.target.value)}
              className="w-32 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Default is 10 MB per security and bandwidth policies.
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <h4 className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-700" />
              Institutional Security Policies Enforced
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
              <li>Role-Based Access Control (SuperAdmin, PayrollOfficer, Employee).</li>
              <li>Strict tenant isolation: Employees can only read and request their own documents.</li>
              <li>Mandatory first-login password change for default/temporary credentials.</li>
              <li>Dual-level file validation: client-side and cloud storage security rules.</li>
              <li>Immutable audit logging for all mutations and sensitive actions.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900 flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
