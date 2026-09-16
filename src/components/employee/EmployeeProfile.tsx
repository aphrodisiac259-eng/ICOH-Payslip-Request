/**
 * ICOH Portal - Employee Profile & Security View
 * Institutional Green & White Theme
 * Enforces strict allowlist of editable personal/contact fields.
 * Prohibits employee tampering with staffId, email, role, department, designation, salaryGrade, step, bankDetails, employmentStatus, accountStatus.
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { changeExistingPassword } from '../../services/authService';
import { updateEmployeeSelfProfile } from '../../services/firestoreService';
import { validatePassword } from '../../utils/validation';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import { formatDate } from '../../utils/formatting';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building,
  Lock,
  Phone,
  MapPin,
  HeartHandshake,
} from 'lucide-react';

export const EmployeeProfile: React.FC = () => {
  const { user, employeeProfile, refreshProfile } = useAuth();

  // Allowlisted editable fields only
  const [phoneNumber, setPhoneNumber] = useState(employeeProfile?.phoneNumber || '');
  const [residentialAddress, setResidentialAddress] = useState(employeeProfile?.residentialAddress || '');
  const [emergencyContact, setEmergencyContact] = useState(employeeProfile?.emergencyContact || '');
  const [nextOfKin, setNextOfKin] = useState(employeeProfile?.nextOfKin || '');
  const [nextOfKinPhone, setNextOfKinPhone] = useState(employeeProfile?.nextOfKinPhone || '');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !employeeProfile) return;

    setSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      await updateEmployeeSelfProfile(user.uid, {
        phoneNumber: phoneNumber.trim(),
        residentialAddress: residentialAddress.trim(),
        emergencyContact: emergencyContact.trim(),
        nextOfKin: nextOfKin.trim(),
        nextOfKinPhone: nextOfKinPhone.trim(),
      });
      await refreshProfile();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err) {
      setProfileError(getFriendlyErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPassError(validation.error || 'Password is invalid');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setChangingPass(true);
    try {
      await changeExistingPassword(newPassword);
      setPassSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(false), 4000);
    } catch (err) {
      setPassError(getFriendlyErrorMessage(err));
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-emerald-800 border-2 border-emerald-600 flex items-center justify-center font-bold text-xl text-emerald-200 shadow-inner">
              {(employeeProfile?.fullName || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold">{employeeProfile?.fullName || 'Official Staff'}</h2>
              <p className="text-xs text-emerald-300 font-mono">
                Staff ID: {employeeProfile?.staffId || 'ICOH-STAFF'} &bull; {employeeProfile?.email}
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-700">
            {employeeProfile?.accountStatus || 'Active'}
          </span>
        </div>

        {/* Profile Information Form */}
        <form onSubmit={handleUpdateProfile} className="p-6 space-y-5">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              Institutional &amp; Contact Information
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              Institutional fields are locked by HR &amp; Payroll Desk
            </span>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Contact details updated successfully.
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {profileError}
            </div>
          )}

          {/* Locked Institutional Fields */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Locked Institutional Records (Read-Only)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  disabled
                  value={employeeProfile?.fullName || ''}
                  className="w-full p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Official ICOH Email</label>
                <input
                  type="email"
                  disabled
                  value={employeeProfile?.email || user?.email || ''}
                  className="w-full p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Official Staff ID</label>
                <input
                  type="text"
                  disabled
                  value={employeeProfile?.staffId || ''}
                  className="w-full p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Department</label>
                <input
                  type="text"
                  disabled
                  value={employeeProfile?.department || ''}
                  className="w-full p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Official Designation</label>
                <input
                  type="text"
                  disabled
                  value={employeeProfile?.designation || ''}
                  className="w-full p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Employment Cadre</label>
                <input
                  type="text"
                  disabled
                  value={employeeProfile?.employmentStatus || 'Permanent'}
                  className="w-full p-2.5 bg-slate-100/90 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Allowlisted Editable Contact Fields */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              Allowlisted Personal &amp; Contact Details (Editable)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label htmlFor="profile-phone-input" className="block font-semibold text-slate-700 mb-1">
                  Primary Phone Number
                </label>
                <input
                  id="profile-phone-input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +234 803 123 4567"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="profile-emergency-input" className="block font-semibold text-slate-700 mb-1">
                  Emergency Contact (Name &amp; Phone)
                </label>
                <input
                  id="profile-emergency-input"
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. Dr. John Doe (+234 802 000 0000)"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="profile-next-of-kin-input" className="block font-semibold text-slate-700 mb-1">
                  Next of Kin (Full Legal Name)
                </label>
                <input
                  id="profile-next-of-kin-input"
                  type="text"
                  value={nextOfKin}
                  onChange={(e) => setNextOfKin(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="profile-next-of-kin-phone-input" className="block font-semibold text-slate-700 mb-1">
                  Next of Kin Phone Number
                </label>
                <input
                  id="profile-next-of-kin-phone-input"
                  type="tel"
                  value={nextOfKinPhone}
                  onChange={(e) => setNextOfKinPhone(e.target.value)}
                  placeholder="e.g. +234 809 111 2222"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="profile-address-input" className="block font-semibold text-slate-700 mb-1">
                  Residential / Postal Address
                </label>
                <textarea
                  id="profile-address-input"
                  rows={2}
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  placeholder="e.g. Plot 14, Federal Medical Quarters, Jos, Plateau State"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 text-slate-900 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="save-profile-button"
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors disabled:opacity-50 shadow-xs"
            >
              {savingProfile ? 'Saving Contact Details...' : 'Save Permitted Updates'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Security Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Confidential Password Management</h3>
            <p className="text-xs text-slate-500">Configure a secure password for your ICOH Staff ID</p>
          </div>
        </div>

        {passSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            Password changed successfully. Please remember your new credentials.
          </div>
        )}

        {passError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {passError}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="mt-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-new-password" className="block font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <input
                id="profile-new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars (letters, numbers, symbols)"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label htmlFor="profile-confirm-password" className="block font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              id="change-password-submit-button"
              type="submit"
              disabled={changingPass}
              className="px-5 py-2.5 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 transition-colors disabled:opacity-50 shadow-xs"
            >
              {changingPass ? 'Updating Credentials...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Access Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-900">Official Data Governance Notice:</strong> Your remuneration records and personnel classifications are synchronized with the Federal Ministry of Health and ICOH Human Resources. For official name, designation, or salary cadre modifications, please lodge a physical request at the Centre Administrative Directorate.
        </div>
      </div>
    </div>
  );
};
