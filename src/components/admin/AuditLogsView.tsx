/**
 * ICOH Portal - Immutable Security Audit Trail
 */

import React, { useEffect, useState, useMemo } from 'react';
import { AuditLog } from '../../types';
import { getAuditLogs } from '../../services/auditService';
import { formatDate } from '../../utils/formatting';
import { Shield, Search, Filter, Lock, CheckCircle2 } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    getAuditLogs(200)
      .then((data) => setLogs(data))
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === '' ||
        log.actorEmail.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.targetCollection.toLowerCase().includes(q) ||
        (log.targetId && log.targetId.toLowerCase().includes(q));

      return matchAction && matchSearch;
    });
  }, [logs, actionFilter, searchTerm]);

  // Distinct actions
  const distinctActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-800" />
              Immutable Security Audit Trail
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only regulatory audit records. Append-only, Zero-Trust compliance.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-semibold self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            Append-Only &bull; Deletion Barred
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Actor, Action, Target ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Audit Actions ({logs.length})</option>
              {distinctActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Loading secure audit stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-700 text-sm">No Audit Records</p>
            <p className="mt-1 text-slate-500">No events matched the current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-3.5 text-left font-sans">Timestamp (UTC)</th>
                  <th className="px-6 py-3.5 text-left font-sans">Actor</th>
                  <th className="px-6 py-3.5 text-left font-sans">Event Action</th>
                  <th className="px-6 py-3.5 text-left font-sans">Target Entity</th>
                  <th className="px-6 py-3.5 text-left font-sans">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.map((log) => (
                  <tr key={log.auditId} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{log.actorEmail}</span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="bg-slate-100 text-emerald-900 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-700">
                      {log.targetCollection}/{log.targetId || '-'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-[11px] max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
