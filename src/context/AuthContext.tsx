/**
 * ICOH Portal - Authentication & RBAC Context
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Employee, Admin, AdminRole } from '../types';
import {
  loginWithStaffIdOrEmail,
  logoutUser,
  completeFirstLoginPasswordChange,
} from '../services/authService';
import { logAuditEvent } from '../services/auditService';

interface AuthContextType {
  user: User | null;
  employeeProfile: Employee | null;
  adminProfile: Admin | null;
  role: 'SuperAdmin' | 'PayrollOfficer' | 'Employee' | null;
  isSuperAdmin: boolean;
  isPayrollOfficer: boolean;
  isEmployee: boolean;
  firstLoginRequired: boolean;
  loading: boolean;
  login: (identifier: string, pass: string, portal?: 'employee' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  submitFirstLoginPasswordChange: (newPass: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employeeProfile, setEmployeeProfile] = useState<Employee | null>(null);
  const [adminProfile, setAdminProfile] = useState<Admin | null>(null);
  const [claimFirstLoginRequired, setClaimFirstLoginRequired] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUserProfile = async (currentUser: User) => {
    try {
      // 0. Check custom claims from verified token
      let tokenClaims: Record<string, unknown> = {};
      try {
        const tokenRes = await currentUser.getIdTokenResult();
        tokenClaims = tokenRes.claims || {};
        if (tokenClaims.firstLoginRequired === true) {
          setClaimFirstLoginRequired(true);
        } else if (tokenClaims.firstLoginRequired === false) {
          setClaimFirstLoginRequired(false);
        }
      } catch {
        // Continue to Firestore check
      }

      // 1. Check Admin Profile
      const adminDocRef = doc(db, 'admins', currentUser.uid);
      const adminDoc = await getDoc(adminDocRef);

      if (adminDoc.exists()) {
        setAdminProfile(adminDoc.data() as Admin);
      } else if (tokenClaims.role === 'SuperAdmin' || tokenClaims.role === 'PayrollOfficer') {
        setAdminProfile({
          uid: currentUser.uid,
          adminId: (tokenClaims.adminId as string) || 'ADMIN',
          email: currentUser.email || '',
          fullName: currentUser.displayName || 'Administrator',
          role: tokenClaims.role as 'SuperAdmin' | 'PayrollOfficer',
          status: 'Active',
          createdAt: new Date().toISOString(),
        });
      } else {
        setAdminProfile(null);
      }

      // 2. Check Employee Profile
      const empDocRef = doc(db, 'employees', currentUser.uid);
      const empDoc = await getDoc(empDocRef);

      if (empDoc.exists()) {
        setEmployeeProfile(empDoc.data() as Employee);
      } else {
        setEmployeeProfile(null);
      }
    } catch (err) {
      console.warn('Error loading user profile permissions:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        setEmployeeProfile(null);
        setAdminProfile(null);
        setClaimFirstLoginRequired(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  const login = async (identifier: string, pass: string, portal?: 'employee' | 'admin') => {
    setLoading(true);
    try {
      const res = await loginWithStaffIdOrEmail(identifier, pass, portal);
      setUser(res.user);
      await loadUserProfile(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setEmployeeProfile(null);
    setAdminProfile(null);
  };

  const submitFirstLoginPasswordChange = async (newPass: string) => {
    await completeFirstLoginPasswordChange(newPass);
    if (user) {
      await loadUserProfile(user);
    }
  };

  // Determine role
  const role: 'SuperAdmin' | 'PayrollOfficer' | 'Employee' | null = useMemo(() => {
    if (adminProfile?.status === 'Active') {
      return adminProfile.role;
    }
    if (employeeProfile && employeeProfile.accountStatus === 'Active') {
      return 'Employee';
    }
    return null;
  }, [adminProfile, employeeProfile]);

  const isSuperAdmin = role === 'SuperAdmin';
  const isPayrollOfficer = role === 'PayrollOfficer';
  const isEmployee = role === 'Employee';

  // Force first-login password change if employee has not completed it yet
  const firstLoginRequired = useMemo(() => {
    if (isEmployee) {
      if (employeeProfile && employeeProfile.firstLoginComplete === false) {
        return true;
      }
      if (claimFirstLoginRequired) {
        return true;
      }
    }
    return false;
  }, [isEmployee, employeeProfile, claimFirstLoginRequired]);

  return (
    <AuthContext.Provider
      value={{
        user,
        employeeProfile,
        adminProfile,
        role,
        isSuperAdmin,
        isPayrollOfficer,
        isEmployee,
        firstLoginRequired,
        loading,
        login,
        logout,
        submitFirstLoginPasswordChange,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
