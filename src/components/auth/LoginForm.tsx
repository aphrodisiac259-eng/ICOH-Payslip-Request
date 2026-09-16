/**
 * ICOH Portal - Authentication Screen
 * Separated Employee Login & Admin / Payroll Login
 * Institutional Green & White Styling with Anti-Enumeration & Zero-Trust Verification
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isPlaceholderConfig, auth } from '../../firebase/config';
import { signInWithCustomToken } from 'firebase/auth';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import {
  Lock,
  User,
  ShieldCheck,
  Building,
  KeyRound,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  ShieldPlus,
  CheckCircle2,
} from 'lucide-react';

interface LoginFormProps {
  initialPortal?: 'employee' | 'admin';
}

export const LoginForm: React.FC<LoginFormProps> = ({ initialPortal }) => {
  const { login } = useAuth();
  
  // Determine initial login portal mode from prop or URL hash/query
  const [loginMode, setLoginMode] = useState<'employee' | 'admin'>(() => {
    if (initialPortal) return initialPortal;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (hash.includes('admin') || params.get('portal') === 'admin') {
        return 'admin';
      }
    }
    return 'employee';
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Bootstrap state for initial setup
  const [superAdminExists, setSuperAdminExists] = useState<boolean | null>(null);
  const [showBootstrapModal, setShowBootstrapModal] = useState(false);
  const [bootstrapFullName, setBootstrapFullName] = useState('');
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapAdminId, setBootstrapAdminId] = useState('ICOH-ADM-001');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  // Check if system has an initial superadmin provisioned
  useEffect(() => {
    let isMounted = true;
    const checkBootstrap = async () => {
      try {
        const res = await fetch('/api/admin/bootstrap-status');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setSuperAdminExists(Boolean(data.superAdminExists));
          }
        }
      } catch {
        // Ignore background check failure
      }
    };
    checkBootstrap();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync mode with hash if hash changes externally
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('admin')) {
        setLoginMode('admin');
      } else if (hash.includes('employee')) {
        setLoginMode('employee');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSwitchMode = (newMode: 'employee' | 'admin') => {
    setLoginMode(newMode);
    setError(null);
    setIdentifier('');
    setPassword('');
    if (typeof window !== 'undefined') {
      window.location.hash = newMode === 'admin' ? '#admin' : '#employee';
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBootstrapError(null);
    if (!bootstrapFullName.trim() || !bootstrapEmail.trim() || !bootstrapAdminId.trim() || !bootstrapPassword) {
      setBootstrapError('All fields are required.');
      return;
    }
    if (!bootstrapSecret.trim()) {
      setBootstrapError('The Institutional Bootstrap Secret (INITIAL_ADMIN_BOOTSTRAP_SECRET) is required to authorize provisioning.');
      return;
    }
    if (bootstrapPassword.length < 8) {
      setBootstrapError('Password must be at least 8 characters.');
      return;
    }

    setBootstrapLoading(true);
    try {
      const res = await fetch('/api/admin/bootstrap-initial-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: bootstrapFullName.trim(),
          email: bootstrapEmail.trim(),
          adminId: bootstrapAdminId.trim(),
          password: bootstrapPassword,
          bootstrapSecret: bootstrapSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to provision initial Super Administrator.');
      }

      setBootstrapSuccess(true);
      setSuperAdminExists(true);

      // Sign in immediately with the custom token
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      }
    } catch (err: unknown) {
      setBootstrapError(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setBootstrapLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlaceholderConfig) {
      setError(
        'Firebase Web API Key is currently set to "your_api_key". Please replace it with your real Firebase Web API key in .env (Firebase Console > Project Settings > General).'
      );
      return;
    }
    if (!identifier.trim() || !password) {
      setError(
        loginMode === 'admin'
          ? 'Please enter your Admin ID or official email and password.'
          : 'Please enter your official Staff ID and password.'
      );
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password, loginMode);
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-100">
      {/* Top Crest */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-800 text-emerald-200 border-2 border-emerald-600 shadow-xl mb-4">
          <Building className="w-9 h-9 text-emerald-300" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
          Intercountry Centre for Oral Health (ICOH) for Africa
        </h2>
        <p className="mt-1 text-xs text-emerald-400 font-medium">
          Federal Ministry of Health and Social Welfare &bull; WHO Collaborating Centre
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Official Staff Payslip Request &amp; Remuneration Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-7 px-6 sm:px-9 shadow-2xl rounded-2xl border border-slate-100 text-slate-800">
          {/* Segmented Portal Selector */}
          <div className="p-1 bg-slate-100 rounded-xl flex items-center mb-6">
            <button
              id="employee-login-tab-button"
              type="button"
              onClick={() => handleSwitchMode('employee')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                loginMode === 'employee'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>Employee Login</span>
            </button>
            <button
              id="admin-login-tab-button"
              type="button"
              onClick={() => handleSwitchMode('admin')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                loginMode === 'admin'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Admin / Payroll Login</span>
            </button>
          </div>

          {/* Mode Subheader */}
          <div className="border-b border-slate-100 pb-4 mb-5 text-center">
            {loginMode === 'employee' ? (
              <>
                <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-700" />
                  Official Staff Authentication
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sign in with your assigned Staff ID &amp; confidential password
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-900 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  Payroll Desk &amp; Admin Console
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Authorized access for Payroll Officers and Super Administrators
                </p>
              </>
            )}
          </div>

          {/* Zero-Trust Notice for Admin Login */}
          {loginMode === 'admin' && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Zero-Trust Authorization:</span> Role clearance (Payroll Desk Officer or Super Administrator) is strictly verified server-side. Manual role selection is prohibited.
              </div>
            </div>
          )}

          {/* First-time Institutional Setup Banner if no SuperAdmin exists */}
          {loginMode === 'admin' && superAdminExists === false && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs shadow-xs">
              <div className="flex items-start gap-2.5">
                <ShieldPlus className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Initial Institutional Setup Required:</span> No Super Administrator account exists yet.
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowBootstrapModal(true)}
                      className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <ShieldPlus className="w-3.5 h-3.5" />
                      <span>Initialize Root Super Administrator</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPlaceholderConfig && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Connected to icoh-employee-payslip-portal:</span>{' '}
                Please supply your real Firebase Web API Key in <code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded text-[11px]">.env</code>{' '}
                to complete authentication setup (Firebase Console &gt; Project Settings &gt; General).
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMode === 'employee' ? (
              <div>
                <label htmlFor="staff-id-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Staff ID
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="staff-id-input"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. ICOH-EMP-012"
                    className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
                    autoComplete="username"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="admin-id-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin ID or Official Email
                </label>
                <div className="relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="admin-id-input"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. ICOH-ADM-001 or official@icoh.org.ng"
                    className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={loginMode === 'employee' ? 'staff-password-input' : 'admin-password-input'}
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                {loginMode === 'employee' && (
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium"
                  >
                    First login guide?
                  </button>
                )}
              </div>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id={loginMode === 'employee' ? 'staff-password-input' : 'admin-password-input'}
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={loginMode === 'employee' ? 'Enter your confidential password' : 'Enter administrator password'}
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              id={loginMode === 'employee' ? 'staff-login-submit-button' : 'admin-login-submit-button'}
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Authenticating...
                </span>
              ) : loginMode === 'employee' ? (
                'Secure Staff Login'
              ) : (
                'Secure Administrator Login'
              )}
            </button>
          </form>

          {/* Quick Switch Links */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            {loginMode === 'employee' ? (
              <button
                type="button"
                onClick={() => handleSwitchMode('admin')}
                className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span>Authorized Payroll Officer or Administrator? Go to Admin Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSwitchMode('employee')}
                className="text-xs text-emerald-800 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 hover:underline"
              >
                <span>Looking for general staff access? Return to Employee Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Security advisory badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Strict Zero-Trust Access Control &bull; Server-Authoritative Roles &bull; Audited</span>
        </div>
      </div>

      {/* Help Modal for First-time Staff Login */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white text-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <HelpCircle className="w-5 h-5 text-emerald-700" />
                Staff First-Time Login Instructions
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>1. Staff Credentials:</strong> Regular employees are provisioned by the Human Resources &amp; Payroll Desk with their unique Staff ID and an initial temporary password.
              </p>
              <p>
                <strong>2. Mandatory Password Change:</strong> On your first authentication attempt, the portal will immediately require you to create your confidential permanent password.
              </p>
              <p>
                <strong>3. Need Help?</strong> If you have not received your Staff ID or your account is suspended, contact the Payroll Desk at{' '}
                <span className="text-emerald-700 font-semibold">payroll@icoh.org.ng</span>.
              </p>
            </div>
            <div className="mt-6 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Root Administrator Bootstrap Modal */}
      {showBootstrapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white text-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ShieldPlus className="w-5 h-5 text-emerald-700" />
                Provision Root Super Administrator
              </div>
              <button
                onClick={() => setShowBootstrapModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {bootstrapSuccess ? (
              <div className="mt-4 text-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900">Provisioning Successful</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Root Super Administrator account has been provisioned and your session is initializing.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBootstrapSubmit} className="mt-4 space-y-3.5">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Establish the primary root administrative account for ICOH. This action is irreversible and can only be executed once.
                </p>

                {bootstrapError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">{bootstrapError}</div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name &amp; Title
                  </label>
                  <input
                    type="text"
                    required
                    value={bootstrapFullName}
                    onChange={(e) => setBootstrapFullName(e.target.value)}
                    placeholder="e.g. Dr. Administrator Name"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    required
                    value={bootstrapEmail}
                    onChange={(e) => setBootstrapEmail(e.target.value)}
                    placeholder="e.g. superadmin@icoh.org.ng"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrator ID
                  </label>
                  <input
                    type="text"
                    required
                    value={bootstrapAdminId}
                    onChange={(e) => setBootstrapAdminId(e.target.value)}
                    placeholder="e.g. ICOH-ADM-001"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Secure Password (min 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={bootstrapPassword}
                    onChange={(e) => setBootstrapPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institutional Bootstrap Secret Key
                  </label>
                  <input
                    type="password"
                    required
                    value={bootstrapSecret}
                    onChange={(e) => setBootstrapSecret(e.target.value)}
                    placeholder="Enter INITIAL_ADMIN_BOOTSTRAP_SECRET"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Requires server-side authorization secret to provision root credentials.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBootstrapModal(false)}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bootstrapLoading}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {bootstrapLoading ? (
                      <span>Provisioning...</span>
                    ) : (
                      <>
                        <ShieldPlus className="w-4 h-4" />
                        <span>Provision Super Administrator</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
