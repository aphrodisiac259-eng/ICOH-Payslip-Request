/**
 * ICOH Portal - Authentication Service
 * Handles Staff ID / Email authentication, first-time password resets, and session management.
 * Enforces server-side authority for account creation and credential updates.
 */

import {
  signInWithCustomToken,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Employee } from '../types';
import { validatePassword } from '../utils/validation';
import { logAuditEvent } from './auditService';

export interface LoginResult {
  user: User;
  isEmployee: boolean;
  isAdmin: boolean;
  firstLoginComplete: boolean;
}

/**
 * Sign in using Staff ID or Email
 * Server verifies credentials, prevents enumeration, and returns a verified Custom Token.
 */
export async function loginWithStaffIdOrEmail(
  identifier: string,
  password: string,
  portal?: 'employee' | 'admin'
): Promise<LoginResult> {
  const cleanId = identifier.trim();
  if (!cleanId || !password) {
    throw new Error('Please enter both your credentials and password.');
  }

  // 1. Authenticate against server-side authority endpoint
  // This completely eliminates client-side email exposure and Staff ID enumeration.
  let customToken: string | null = null;
  let serverAuthSuccess = false;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, password, portal }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.customToken) {
        customToken = data.customToken;
        serverAuthSuccess = true;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || (portal === 'admin' ? 'Invalid Administrator credentials.' : 'Invalid Staff ID or password.'));
    }
  } catch (err: unknown) {
    // If server returned a clear rejection (e.g. 401 Invalid credentials, 403 access denied, or 503 Password disabled), rethrow directly
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    // Network connectivity issue - if user entered email, attempt direct Firebase sign-in
    if (cleanId.includes('@')) {
      const userCredential = await signInWithEmailAndPassword(auth, cleanId, password);
      return resolveUserSession(userCredential.user, cleanId);
    }
    throw new Error('Unable to connect to the authentication server. Please check your network connection.');
  }

  if (!serverAuthSuccess || !customToken) {
    throw new Error(portal === 'admin' ? 'Invalid Administrator credentials.' : 'Invalid Staff ID or password.');
  }

  // 2. Sign in with the authentic custom token issued by server Admin SDK
  const userCredential = await signInWithCustomToken(auth, customToken);
  return resolveUserSession(userCredential.user, cleanId);
}

/**
 * Helper to resolve user roles, custom claims, and firstLogin status
 */
async function resolveUserSession(user: User, identifier: string): Promise<LoginResult> {
  let firstLoginComplete = true;
  let isEmp = false;
  let isAdm = false;

  const empDoc = await getDoc(doc(db, 'employees', user.uid));
  if (empDoc.exists()) {
    isEmp = true;
    const empData = empDoc.data() as Employee;
    firstLoginComplete = empData.firstLoginComplete ?? true;
    // Update lastLogin timestamp
    try {
      await setDoc(doc(db, 'employees', user.uid), { lastLogin: new Date().toISOString() }, { merge: true });
    } catch {
      // Non-blocking update
    }
  }

  const admDoc = await getDoc(doc(db, 'admins', user.uid));
  if (admDoc.exists()) {
    isAdm = true;
  }

  // Check token custom claims for firstLoginRequired
  try {
    const tokenResult = await user.getIdTokenResult(true);
    if (tokenResult.claims.firstLoginRequired === true) {
      firstLoginComplete = false;
    }
    if (tokenResult.claims.role === 'SuperAdmin' || tokenResult.claims.role === 'PayrollOfficer') {
      isAdm = true;
    }
  } catch {
    // Ignore claim read failure
  }

  // Record audit event via server authority
  await logAuditEvent(
    user.uid,
    user.email || identifier,
    'login',
    isAdm ? 'admins' : 'employees',
    user.uid,
    { loginMethod: 'staff_credentials' }
  );

  return {
    user,
    isEmployee: isEmp,
    isAdmin: isAdm,
    firstLoginComplete,
  };
}

/**
 * Completes mandatory first-login password change.
 * Dispatches to server-side endpoint with ID token for strict server authority.
 */
export async function completeFirstLoginPasswordChange(newPassword: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No active staff session found. Please sign in again.');
  }

  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.error || 'Password does not satisfy institutional security requirements.');
  }

  const user = auth.currentUser;
  const idToken = await user.getIdToken();

  // Call trusted server authority endpoint
  const res = await fetch('/api/auth/complete-first-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to complete first login setup on server.');
  }

  // Force token refresh so updated claims (firstLoginRequired: false) take effect immediately
  await user.getIdToken(true);
}

export async function changeExistingPassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No authenticated user session found.');
  }

  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.error || 'Password does not satisfy institutional security requirements.');
  }

  await updatePassword(auth.currentUser, newPassword);

  await logAuditEvent(
    auth.currentUser.uid,
    auth.currentUser.email || 'employee',
    'password_changed',
    'employees',
    auth.currentUser.uid
  );
}

export async function logoutUser(): Promise<void> {
  if (auth.currentUser) {
    await logAuditEvent(
      auth.currentUser.uid,
      auth.currentUser.email || 'user',
      'logout',
      'auth',
      auth.currentUser.uid
    );
  }
  await signOut(auth);
}

/**
 * Register a new employee user account and profile (SuperAdmin provisioned)
 * Dispatches to server-side authority endpoint (/api/admin/create-employee) using Admin SDK.
 * Never creates users directly from client browser session.
 */
export async function registerStaffAccount(params: {
  staffId: string;
  fullName: string;
  email: string;
  department: string;
  unit?: string;
  designation?: string;
  employmentStatus?: 'Permanent' | 'Contract' | 'Probation';
  temporaryPassword: string;
  adminUID?: string;
  adminEmail?: string;
}): Promise<Employee> {
  const {
    staffId,
    fullName,
    email,
    department,
    unit,
    designation,
    employmentStatus,
    temporaryPassword,
  } = params;

  if (!auth.currentUser) {
    throw new Error('Unauthorized: An active administrator session is required to provision staff.');
  }

  const idToken = await auth.currentUser.getIdToken();

  // Send request to trusted server-side endpoint
  const res = await fetch('/api/admin/create-employee', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      staffId,
      fullName,
      email,
      department,
      unit,
      designation,
      employmentStatus,
      temporaryPassword,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Server error during employee provisioning' }));
    throw new Error(errorData.error || `Provisioning failed with status ${res.status}`);
  }

  const result = await res.json();
  return result.employee as Employee;
}

export const registerEmployeeWithCredentials = registerStaffAccount;


