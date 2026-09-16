/**
 * ICOH Portal - Mandatory First-Login Password Change Screen
 * Blocks all dashboard navigation until the employee updates their default credentials.
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { validatePassword } from '../../utils/validation';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import { ShieldAlert, Lock, Check, X, AlertCircle } from 'lucide-react';

export const FirstLoginPasswordChange: React.FC = () => {
  const { employeeProfile, user, submitFirstLoginPasswordChange, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Criteria checks for dynamic UI indicators
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setError(validation.error || 'Password does not meet required strength.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match the new password.');
      return;
    }

    setLoading(true);
    try {
      await submitFirstLoginPasswordChange(newPassword);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-800 my-8">
        {/* Header */}
        <div className="text-center pb-5 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-800 border-2 border-amber-300 mb-3">
            <ShieldAlert className="w-8 h-8 text-amber-700" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Mandatory Security Update</h2>
          <p className="text-xs text-slate-500 mt-1">
            Official Civil Service Security Protocol &bull; First-Time Login
          </p>
        </div>

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs leading-relaxed">
          Welcome to the ICOH Portal, <span className="font-semibold">{employeeProfile?.fullName || user?.email}</span> ({employeeProfile?.staffId}). For your data isolation and confidentiality, you must change your initial temporary password before gaining access to your dashboard and payslips.
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Confidential Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="first-login-new-password-input"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 strong characters"
                className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="first-login-confirm-password-input"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <span className="font-semibold text-slate-700 block mb-1">Institutional Password Policy:</span>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                8+ Characters
              </div>
              <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                Uppercase Letter (A-Z)
              </div>
              <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                {hasLowercase ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                Lowercase Letter (a-z)
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                Number (0-9)
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                {hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                Special Symbol (!@#$)
              </div>
              <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-300" />}
                Passwords Match
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              id="first-login-cancel-logout-button"
              type="button"
              onClick={logout}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Sign Out
            </button>
            <button
              id="first-login-update-password-button"
              type="submit"
              disabled={loading || !passwordsMatch || !hasMinLength}
              className="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-hidden disabled:opacity-50 transition-colors"
            >
              {loading ? 'Securing Account...' : 'Set Password & Enter Portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
