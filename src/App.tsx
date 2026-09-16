/**
 * ICOH Payslip Request Portal - Main Application Component
 * Federal Republic of Nigeria - Intercountry Centre for Oral Health (ICOH) for Africa
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Common Components
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { NotificationDrawer } from './components/common/NotificationDrawer';

// Auth Components
import { LoginForm } from './components/auth/LoginForm';
import { FirstLoginPasswordChange } from './components/auth/FirstLoginPasswordChange';

// Employee Views
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { RequestPayslipForm } from './components/employee/RequestPayslipForm';
import { MyPayslips } from './components/employee/MyPayslips';
import { RequestHistory } from './components/employee/RequestHistory';
import { EmployeeProfile } from './components/employee/EmployeeProfile';

// Admin / Payroll Views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { RequestManagement } from './components/admin/RequestManagement';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { DepartmentManagement } from './components/admin/DepartmentManagement';
import { Reports } from './components/admin/Reports';
import { AuditLogsView } from './components/admin/AuditLogsView';
import { SystemSettingsView } from './components/admin/SystemSettingsView';

import { PayslipRequest } from './types';
import { Building, ShieldAlert, AlertCircle } from 'lucide-react';

const MainPortal: React.FC = () => {
  const { user, role, loading, firstLoginRequired, employeeProfile, isSuperAdmin, isPayrollOfficer } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState<boolean>(false);
  const [selectedAdminRequest, setSelectedAdminRequest] = useState<PayslipRequest | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-800 border-2 border-emerald-600 flex items-center justify-center text-emerald-200 shadow-2xl mb-4 animate-pulse">
          <Building className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-3">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-400 border-t-transparent"></span>
          <span className="text-sm font-semibold tracking-wide">Authenticating with ICOH Security Vault...</span>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-mono">Intercountry Centre for Oral Health for Africa</p>
      </div>
    );
  }

  // Not authenticated: Render Login Screen (redirect unauthenticated admin access directly to admin login)
  if (!user) {
    const isTargetingAdmin = typeof window !== 'undefined' && (
      window.location.hash.toLowerCase().includes('admin') ||
      new URLSearchParams(window.location.search).get('portal') === 'admin'
    );
    return <LoginForm initialPortal={isTargetingAdmin ? 'admin' : 'employee'} />;
  }

  // Mandatory First-Login Password Enforcement Gate
  // Completely blocks all dashboard navigation until the new employee sets their permanent password
  if (firstLoginRequired) {
    return <FirstLoginPasswordChange />;
  }

  // Inactive employee account check
  if (role === 'Employee' && employeeProfile?.accountStatus === 'Inactive') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white text-center">
        <div className="bg-white text-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Account Access Suspended</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Your staff account ({employeeProfile.staffId}) is currently marked as Inactive by Human Resources or the Payroll Desk.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Please contact the Centre Administrator at <span className="font-semibold text-emerald-700">admin@icoh.org.ng</span>.
          </p>
        </div>
      </div>
    );
  }

  const handleOpenAdminRequest = (req: PayslipRequest) => {
    setSelectedAdminRequest(req);
    setActiveTab('admin-requests');
  };

  const handleNavigateFromNotification = (requestId: string) => {
    if (role === 'Employee') {
      setActiveTab('history');
    } else {
      setActiveTab('admin-requests');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      {/* Institutional Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedAdminRequest(null);
        }}
        openNotificationDrawer={() => setNotificationDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* EMPLOYEE WORKSPACE */}
        {role === 'Employee' && (
          <>
            {/* Strict Access Control Guard: Prevent Employee from accessing Admin routes */}
            {activeTab.startsWith('admin-') ? (
              <div className="bg-white rounded-2xl p-8 max-w-lg mx-auto text-center shadow-lg border border-rose-200 mt-6">
                <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Access Denied: Administrative Clearance Required</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Your authenticated account ({employeeProfile?.staffId || 'Employee'}) does not possess Payroll Desk Officer or Super Administrator clearance. Unauthorized access attempts are logged.
                </p>
                <button
                  id="return-to-employee-dashboard-btn"
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  Return to Employee Dashboard
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <EmployeeDashboard onNavigateTab={(t) => setActiveTab(t)} />
                )}
                {activeTab === 'request' && (
                  <RequestPayslipForm onSuccess={() => setActiveTab('history')} />
                )}
                {activeTab === 'payslips' && <MyPayslips />}
                {activeTab === 'history' && (
                  <RequestHistory onNavigateTab={(t) => setActiveTab(t)} />
                )}
                {activeTab === 'profile' && <EmployeeProfile />}
              </>
            )}
          </>
        )}

        {/* ADMIN & PAYROLL OFFICER WORKSPACE */}
        {(role === 'SuperAdmin' || role === 'PayrollOfficer') && (
          <>
            {/* Strict Least-Privilege Guard: Prevent PayrollOfficer from accessing SuperAdmin-only routes */}
            {isPayrollOfficer && (activeTab === 'admin-departments' || activeTab === 'admin-audit' || activeTab === 'admin-settings') ? (
              <div className="bg-white rounded-2xl p-8 max-w-lg mx-auto text-center shadow-lg border border-amber-200 mt-6">
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Super Administrator Clearance Required</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  This console module is restricted to Super Administrators. Payroll Desk Officers have clearance limited to payslip request queues, certified PDF issuance, and payroll analytics.
                </p>
                <button
                  id="return-to-payroll-console-btn"
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  Return to Payroll Operations Console
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <AdminDashboard
                    onNavigateTab={(t) => setActiveTab(t)}
                    onOpenRequest={handleOpenAdminRequest}
                  />
                )}
                {activeTab === 'admin-requests' && (
                  <RequestManagement
                    initialSelectedRequest={selectedAdminRequest}
                    onClearInitialRequest={() => setSelectedAdminRequest(null)}
                  />
                )}
                {activeTab === 'admin-employees' && <EmployeeManagement />}
                {activeTab === 'admin-reports' && <Reports />}

                {/* SuperAdmin ONLY Consoles */}
                {isSuperAdmin && activeTab === 'admin-departments' && <DepartmentManagement />}
                {isSuperAdmin && activeTab === 'admin-audit' && <AuditLogsView />}
                {isSuperAdmin && activeTab === 'admin-settings' && <SystemSettingsView />}

                {activeTab === 'profile' && <EmployeeProfile />}
              </>
            )}
          </>
        )}
      </main>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        onNavigateToRequest={handleNavigateFromNotification}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainPortal />
      </NotificationProvider>
    </AuthProvider>
  );
}
