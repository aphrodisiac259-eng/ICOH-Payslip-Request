/**
 * ICOH Portal - Top Navigation & Institutional Header
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  LogOut,
  Shield,
  User as UserIcon,
  FileText,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openNotificationDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openNotificationDrawer,
}) => {
  const { user, employeeProfile, adminProfile, role, logout, isSuperAdmin, isPayrollOfficer } = useAuth();
  const { unreadCount } = useNotifications();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const displayName =
    employeeProfile?.fullName || adminProfile?.fullName || user?.displayName || user?.email || 'User';

  const staffId = employeeProfile?.staffId || adminProfile?.adminId;

  return (
    <header className="bg-emerald-900 text-white border-b border-emerald-800 sticky top-0 z-40 shadow-sm">
      {/* Top green institutional crest banner */}
      <div className="bg-emerald-950 px-4 py-1.5 text-xs text-emerald-300 flex items-center justify-between border-b border-emerald-900/60">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold tracking-wide">FEDERAL REPUBLIC OF NIGERIA</span>
          <span className="text-emerald-500">|</span>
          <span className="hidden sm:inline">FEDERAL MINISTRY OF HEALTH & SOCIAL WELFARE</span>
        </div>
        <div className="flex items-center space-x-3 text-emerald-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">WHO Collaborating Centre</span>
          </span>
          <span className="text-emerald-600">|</span>
          <span className="font-mono text-[11px] text-emerald-300">SECURE INTERNAL PORTAL</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-emerald-800 border border-emerald-600 flex items-center justify-center text-emerald-100 shadow-inner">
              <Building className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                ICOH PAYSYS
                <span className="text-[10px] uppercase font-semibold bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-700">
                  {role === 'SuperAdmin' ? 'Super Admin' : role === 'PayrollOfficer' ? 'Payroll Desk' : 'Staff'}
                </span>
              </div>
              <div className="text-xs text-emerald-300 hidden md:block">
                Intercountry Centre for Oral Health for Africa, Jos
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              id="nav-tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-800 text-white'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              Dashboard
            </button>

            {/* Employee Specific Tabs */}
            {role === 'Employee' && (
              <>
                <button
                  id="nav-tab-request"
                  onClick={() => setActiveTab('request')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'request'
                      ? 'bg-emerald-800 text-white'
                      : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                  }`}
                >
                  Request Payslip
                </button>
                <button
                  id="nav-tab-payslips"
                  onClick={() => setActiveTab('payslips')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'payslips'
                      ? 'bg-emerald-800 text-white'
                      : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                  }`}
                >
                  My Payslips
                </button>
                <button
                  id="nav-tab-history"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'history'
                      ? 'bg-emerald-800 text-white'
                      : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                  }`}
                >
                  Request History
                </button>
              </>
            )}

            {/* Admin / Payroll Officer Tabs */}
            {(isSuperAdmin || isPayrollOfficer) && (
              <>
                <button
                  id="nav-tab-admin-requests"
                  onClick={() => setActiveTab('admin-requests')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'admin-requests'
                      ? 'bg-emerald-800 text-white'
                      : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                  }`}
                >
                  Payslip Requests
                </button>
                <button
                  id="nav-tab-admin-employees"
                  onClick={() => setActiveTab('admin-employees')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'admin-employees'
                      ? 'bg-emerald-800 text-white'
                      : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                  }`}
                >
                  Employees
                </button>
                <button
                  id="nav-tab-admin-reports"
                  onClick={() => setActiveTab('admin-reports')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'admin-reports'
                      ? 'bg-emerald-800 text-white'
                      : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                  }`}
                >
                  Reports
                </button>
                {isSuperAdmin && (
                  <>
                    <button
                      id="nav-tab-admin-departments"
                      onClick={() => setActiveTab('admin-departments')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'admin-departments'
                          ? 'bg-emerald-800 text-white'
                          : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                      }`}
                    >
                      Departments
                    </button>
                    <button
                      id="nav-tab-admin-audit"
                      onClick={() => setActiveTab('admin-audit')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'admin-audit'
                          ? 'bg-emerald-800 text-white'
                          : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
                      }`}
                    >
                      Audit Trail
                    </button>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Right Actions: Notifications & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Notification Bell */}
            <button
              id="header-notification-button"
              onClick={openNotificationDrawer}
              className="relative p-2 rounded-full text-emerald-200 hover:text-white hover:bg-emerald-800 focus:outline-none transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-emerald-950">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                id="header-profile-menu-button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 focus:outline-none transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-emerald-100 flex items-center justify-center font-bold text-xs border border-emerald-500">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left text-xs">
                  <div className="font-medium text-white max-w-[130px] truncate">{displayName}</div>
                  <div className="text-emerald-300 font-mono text-[10px]">{staffId || user?.email}</div>
                </div>
              </button>

              {profileDropdownOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50 text-slate-800 text-sm">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-semibold text-slate-900 truncate">{displayName}</p>
                    <p className="text-xs text-slate-500 font-mono truncate">{user?.email}</p>
                    {staffId && <p className="text-[11px] text-emerald-700 font-mono mt-0.5">ID: {staffId}</p>}
                    <span className="mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                      {role || 'Standard Staff'}
                    </span>
                  </div>

                  <button
                    id="profile-dropdown-profile-link"
                    onClick={() => {
                      setActiveTab('profile');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-slate-500" />
                    Profile & Password
                  </button>

                  {isSuperAdmin && (
                    <button
                      id="profile-dropdown-settings-link"
                      onClick={() => {
                        setActiveTab('admin-settings');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Shield className="w-4 h-4 text-emerald-700" />
                      System Settings
                    </button>
                  )}

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    id="profile-dropdown-logout-button"
                    onClick={async () => {
                      setProfileDropdownOpen(false);
                      await logout();
                    }}
                    className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
