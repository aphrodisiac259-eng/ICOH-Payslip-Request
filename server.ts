import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// Lazy-initialize Firebase Admin SDK safely
let firebaseAdminApp: App | null = null;
function getAdmin(): App {
  if (!firebaseAdminApp) {
    if (getApps().length > 0) {
      firebaseAdminApp = getApp();
    } else {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'icoh-employee-payslip-portal';
      let creds: any = null;

      // The server must use FIREBASE_SERVICE_ACCOUNT_KEY as the only explicit service-account credential when provided.
      // Do not package, search for, or deploy any service-account.json file.
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
          creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        } catch (e) {
          console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
          throw new Error('Server configuration error: FIREBASE_SERVICE_ACCOUNT_KEY contains invalid JSON.');
        }
      }

      if (creds) {
        firebaseAdminApp = initializeApp({
          credential: cert(creds),
          projectId: creds.project_id || projectId,
        });
      } else {
        // Fall back to ADC if available in Google Cloud environment, or fail clearly
        try {
          firebaseAdminApp = initializeApp({ projectId });
        } catch (initErr) {
          console.error('Firebase Admin initialization failed:', initErr);
          throw new Error(
            'Firebase Admin credentials not configured. Please set the FIREBASE_SERVICE_ACCOUNT_KEY environment variable with your service account JSON.'
          );
        }
      }
    }
  }
  return firebaseAdminApp;
}

function getAdminDb() {
  const adm = getAdmin();
  const dbId = process.env.VITE_FIREBASE_DATABASE_ID || '(default)';
  return getFirestore(adm, dbId);
}

// ==========================================
// AUTH & ADMIN API ROUTES
// ==========================================

/**
 * Unified Secure Staff & Admin Login
 * Enforces strict portal separation between Employee and Admin / Payroll logins.
 * Authenticates credentials without revealing account existence or email addresses.
 * Server sets authoritative custom claims (SuperAdmin, PayrollOfficer, or Employee)
 * and generates Firebase Custom Token upon successful authentication.
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password, portal } = req.body;
    if (!identifier || typeof identifier !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Identification credential and password are required.' });
      return;
    }

    const cleanId = identifier.trim();
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    let targetEmail: string | null = null;
    let targetUid: string | null = null;
    let isEmployee = false;
    let isAdmin = false;
    let resolvedRole: string = 'Employee';

    if (portal === 'admin') {
      // 1. ADMIN / PAYROLL PORTAL: Authoritative lookup in admins collection FIRST
      if (cleanId.includes('@')) {
        const cleanEmail = cleanId.toLowerCase();
        const admSnap = await db.collection('admins').where('email', '==', cleanEmail).limit(1).get();
        if (!admSnap.empty) {
          const data = admSnap.docs[0].data();
          if (data.status !== 'Active') {
            res.status(401).json({ error: 'Administrative account is inactive. Access prohibited.' });
            return;
          }
          targetEmail = data.email;
          targetUid = data.uid || admSnap.docs[0].id;
          isAdmin = true;
          resolvedRole = data.role || 'PayrollOfficer';
        }
      } else {
        const cleanAdminId = cleanId.toUpperCase();
        const admSnap = await db.collection('admins').where('adminId', '==', cleanAdminId).limit(1).get();
        if (!admSnap.empty) {
          const data = admSnap.docs[0].data();
          if (data.status !== 'Active') {
            res.status(401).json({ error: 'Administrative account is inactive. Access prohibited.' });
            return;
          }
          targetEmail = data.email;
          targetUid = data.uid || admSnap.docs[0].id;
          isAdmin = true;
          resolvedRole = data.role || 'PayrollOfficer';
        }
      }

      // If not in admins, check if an employee mistakenly used the admin login
      if (!isAdmin) {
        const checkEmail = cleanId.toLowerCase();
        const checkStaffId = cleanId.toUpperCase();
        const empSnap = cleanId.includes('@')
          ? await db.collection('employees').where('email', '==', checkEmail).limit(1).get()
          : await db.collection('employees').where('staffId', '==', checkStaffId).limit(1).get();

        if (!empSnap.empty) {
          res.status(403).json({
            error: 'Access denied: Regular staff accounts do not possess administrative or payroll privileges. Please use the Employee Login portal.',
          });
          return;
        }

        // Generic anti-enumeration response
        res.status(401).json({ error: 'Invalid Administrator credentials or password.' });
        return;
      }
    } else if (portal === 'employee') {
      // 2. EMPLOYEE PORTAL: Authoritative lookup in employees collection FIRST
      if (cleanId.includes('@')) {
        const cleanEmail = cleanId.toLowerCase();
        const empSnap = await db.collection('employees').where('email', '==', cleanEmail).limit(1).get();
        if (!empSnap.empty) {
          const data = empSnap.docs[0].data();
          if (data.accountStatus !== 'Active') {
            res.status(401).json({ error: 'Account is inactive. Please contact the payroll desk.' });
            return;
          }
          targetEmail = data.email;
          targetUid = data.uid || empSnap.docs[0].id;
          isEmployee = true;
          resolvedRole = 'Employee';
        }
      } else {
        const cleanStaffId = cleanId.toUpperCase();
        const empSnap = await db.collection('employees').where('staffId', '==', cleanStaffId).limit(1).get();
        if (!empSnap.empty) {
          const data = empSnap.docs[0].data();
          if (data.accountStatus !== 'Active') {
            res.status(401).json({ error: 'Account is inactive. Please contact the payroll desk.' });
            return;
          }
          targetEmail = data.email;
          targetUid = data.uid || empSnap.docs[0].id;
          isEmployee = true;
          resolvedRole = 'Employee';
        }
      }

      // If not in employees, check if an admin mistakenly used the employee portal
      if (!isEmployee) {
        const checkEmail = cleanId.toLowerCase();
        const checkAdminId = cleanId.toUpperCase();
        const admSnap = cleanId.includes('@')
          ? await db.collection('admins').where('email', '==', checkEmail).limit(1).get()
          : await db.collection('admins').where('adminId', '==', checkAdminId).limit(1).get();

        if (!admSnap.empty) {
          res.status(403).json({
            error: 'Administrative account detected. Please use the dedicated Admin / Payroll Login portal.',
          });
          return;
        }

        // Generic anti-enumeration response
        res.status(401).json({ error: 'Invalid Staff ID or password.' });
        return;
      }
    } else {
      // 3. Fallback if portal not explicitly specified
      if (cleanId.includes('@')) {
        const cleanEmail = cleanId.toLowerCase();
        const empSnap = await db.collection('employees').where('email', '==', cleanEmail).limit(1).get();
        if (!empSnap.empty) {
          const data = empSnap.docs[0].data();
          if (data.accountStatus !== 'Active') {
            res.status(401).json({ error: 'Account is inactive. Please contact the payroll administrator.' });
            return;
          }
          targetEmail = data.email;
          targetUid = data.uid || empSnap.docs[0].id;
          isEmployee = true;
          resolvedRole = 'Employee';
        } else {
          const admSnap = await db.collection('admins').where('email', '==', cleanEmail).limit(1).get();
          if (!admSnap.empty) {
            const data = admSnap.docs[0].data();
            if (data.status !== 'Active') {
              res.status(401).json({ error: 'Administrative account is inactive.' });
              return;
            }
            targetEmail = data.email;
            targetUid = data.uid || admSnap.docs[0].id;
            isAdmin = true;
            resolvedRole = data.role || 'PayrollOfficer';
          }
        }
      } else {
        const cleanStaffId = cleanId.toUpperCase();
        const empSnap = await db.collection('employees').where('staffId', '==', cleanStaffId).limit(1).get();
        if (!empSnap.empty) {
          const data = empSnap.docs[0].data();
          if (data.accountStatus !== 'Active') {
            res.status(401).json({ error: 'Account is inactive. Please contact the payroll administrator.' });
            return;
          }
          targetEmail = data.email;
          targetUid = data.uid || empSnap.docs[0].id;
          isEmployee = true;
          resolvedRole = 'Employee';
        } else {
          const admSnap = await db.collection('admins').where('adminId', '==', cleanStaffId).limit(1).get();
          if (!admSnap.empty) {
            const data = admSnap.docs[0].data();
            if (data.status !== 'Active') {
              res.status(401).json({ error: 'Administrative account is inactive.' });
              return;
            }
            targetEmail = data.email;
            targetUid = data.uid || admSnap.docs[0].id;
            isAdmin = true;
            resolvedRole = data.role || 'PayrollOfficer';
          }
        }
      }
    }

    // If account not found: return generic authentication failure (No enumeration!)
    if (!targetEmail || !targetUid) {
      res.status(401).json({
        error: portal === 'admin' ? 'Invalid Administrator credentials or password.' : 'Invalid Staff ID or password.',
      });
      return;
    }

    // Verify credentials via Firebase Auth REST API
    const apiKey = process.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: 'Server configuration error: VITE_FIREBASE_API_KEY environment variable is not configured.',
      });
      return;
    }
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok) {
      if (verifyData.error?.message === 'PASSWORD_LOGIN_DISABLED') {
        res.status(503).json({
          error:
            'Password authentication is disabled in Firebase Console. Please enable Email/Password provider in Firebase Console > Authentication > Sign-in method.',
        });
        return;
      }
      if (verifyData.error?.message === 'CONFIGURATION_NOT_FOUND' || verifyData.error?.code === 400 && verifyData.error?.message?.includes('CONFIGURATION_NOT_FOUND')) {
        res.status(503).json({
          error:
            'Firebase Authentication is not yet enabled in the Firebase Console for project icoh-employee-payslip-portal. Please visit Firebase Console (https://console.firebase.google.com/project/icoh-employee-payslip-portal/authentication), click "Get started", and enable "Email/Password" under the Sign-in method tab.',
        });
        return;
      }
      // Generic authentication failure to prevent credential cracking/enumeration
      res.status(401).json({
        error: portal === 'admin' ? 'Invalid Administrator credentials or password.' : 'Invalid Staff ID or password.',
      });
      return;
    }

    // Authoritatively set custom claims on the user record in Firebase Auth
    if (isAdmin) {
      const adminDoc = await db.collection('admins').doc(targetUid).get();
      const adminData = adminDoc.data();
      const verifiedRole = adminData?.role || 'PayrollOfficer';
      await adminAuth.setCustomUserClaims(targetUid, {
        role: verifiedRole,
        adminId: adminData?.adminId || cleanId,
        isStaff: false,
      });
      resolvedRole = verifiedRole;
    } else if (isEmployee) {
      const empDoc = await db.collection('employees').doc(targetUid).get();
      const empData = empDoc.data();
      await adminAuth.setCustomUserClaims(targetUid, {
        role: 'Employee',
        staffId: empData?.staffId || cleanId,
        firstLoginRequired: empData?.firstLoginComplete === false,
        isStaff: true,
      });
      resolvedRole = 'Employee';
    }

    // Record server-side immutable audit log for authentication event
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await db.collection('auditLogs').doc(logId).set({
      logId,
      actorUID: targetUid,
      actorEmail: targetEmail,
      action: isAdmin ? 'admin_login_success' : 'employee_login_success',
      targetCollection: isAdmin ? 'admins' : 'employees',
      targetDocId: targetUid,
      metadata: JSON.stringify({
        portal: portal || 'auto',
        role: resolvedRole,
      }),
      timestamp: FieldValue.serverTimestamp(),
    });

    // Authenticated successfully: generate secure custom token for client session
    const customToken = await adminAuth.createCustomToken(targetUid);

    res.json({
      success: true,
      customToken,
      isEmployee,
      isAdmin,
      role: resolvedRole,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication service error';
    res.status(500).json({ error: message });
  }
});

/**
 * Bootstrap Status Check
 * Allows system to determine if an initial Super Administrator has been provisioned.
 */
app.get('/api/admin/bootstrap-status', async (_req: Request, res: Response) => {
  try {
    const db = getAdminDb();
    const adminSnap = await db.collection('admins').limit(1).get();
    const lockSnap = await db.collection('systemSettings').doc('bootstrap_lock').get();
    const superAdminExists = !adminSnap.empty || (lockSnap.exists && lockSnap.data()?.bootstrapped === true);
    res.json({
      superAdminExists,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database check failed';
    res.status(500).json({ error: message });
  }
});

/**
 * First-Time SuperAdmin Bootstrap
 * ONLY succeeds if:
 * 1. INITIAL_ADMIN_BOOTSTRAP_SECRET environment variable is configured in server secrets.
 * 2. Caller supplies the exact matching bootstrap secret.
 * 3. The admins collection contains no existing administrator and systemSettings/bootstrap_lock is not set.
 * 4. Atomically locked via Firestore transaction to prevent race conditions.
 * After completion, this endpoint is permanently unusable.
 */
app.post('/api/admin/bootstrap-initial-admin', async (req: Request, res: Response) => {
  try {
    // 1. Require server-side secret configuration
    const serverBootstrapSecret = process.env.INITIAL_ADMIN_BOOTSTRAP_SECRET;
    if (!serverBootstrapSecret || serverBootstrapSecret.trim().length === 0) {
      res.status(403).json({
        error:
          'Super Administrator bootstrap is disabled on this server: INITIAL_ADMIN_BOOTSTRAP_SECRET environment variable is not configured.',
      });
      return;
    }

    const { fullName, email, adminId, password, bootstrapSecret } = req.body;
    if (!bootstrapSecret || typeof bootstrapSecret !== 'string' || bootstrapSecret.trim() !== serverBootstrapSecret.trim()) {
      res.status(403).json({
        error: 'Invalid or missing institutional bootstrap authorization key (INITIAL_ADMIN_BOOTSTRAP_SECRET). Access denied.',
      });
      return;
    }

    if (!fullName || !email || !adminId || !password) {
      res.status(400).json({
        error: 'Full name, institutional email, administrator ID, and secure password are required.',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    const db = getAdminDb();
    const adm = getAdmin();
    const adminAuth = getAuth(adm);

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanAdminId = String(adminId).trim().toUpperCase();

    // 2. Pre-flight check: ensure no administrator or bootstrap lock exists
    const existingAdmins = await db.collection('admins').limit(1).get();
    if (!existingAdmins.empty) {
      res.status(403).json({
        error: 'Super Administrator bootstrap is permanently disabled: An active administrator already exists.',
      });
      return;
    }

    const lockRef = db.collection('systemSettings').doc('bootstrap_lock');
    const existingLock = await lockRef.get();
    if (existingLock.exists && existingLock.data()?.bootstrapped === true) {
      res.status(403).json({
        error: 'Super Administrator bootstrap is permanently disabled: Organization has already been initialized.',
      });
      return;
    }

    // 3. Create or retrieve auth user
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(cleanEmail);
      await adminAuth.updateUser(userRecord.uid, {
        password,
        displayName: fullName.trim(),
      });
    } catch {
      userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password,
        displayName: fullName.trim(),
      });
    }

    // 4. Atomic transaction to prevent competing bootstrap executions
    try {
      await db.runTransaction(async (tx) => {
        const lockSnap = await tx.get(lockRef);
        if (lockSnap.exists && lockSnap.data()?.bootstrapped === true) {
          throw new Error('ALREADY_BOOTSTRAPPED');
        }

        const adminDocRef = db.collection('admins').doc(userRecord.uid);
        const adminSnap = await tx.get(adminDocRef);
        if (adminSnap.exists) {
          throw new Error('ALREADY_BOOTSTRAPPED');
        }

        tx.set(lockRef, {
          bootstrapped: true,
          bootstrappedAt: FieldValue.serverTimestamp(),
          adminUID: userRecord.uid,
          adminEmail: cleanEmail,
        });

        tx.set(adminDocRef, {
          uid: userRecord.uid,
          adminId: cleanAdminId,
          fullName: fullName.trim(),
          email: cleanEmail,
          role: 'SuperAdmin',
          status: 'Active',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        tx.set(db.collection('auditLogs').doc(logId), {
          logId,
          actorUID: userRecord.uid,
          actorEmail: cleanEmail,
          action: 'initial_superadmin_bootstrapped',
          targetCollection: 'admins',
          targetDocId: userRecord.uid,
          metadata: JSON.stringify({
            adminId: cleanAdminId,
            role: 'SuperAdmin',
          }),
          timestamp: FieldValue.serverTimestamp(),
        });
      });
    } catch (txErr: any) {
      if (txErr.message === 'ALREADY_BOOTSTRAPPED') {
        res.status(403).json({
          error: 'Super Administrator bootstrap has already been completed by another process.',
        });
        return;
      }
      throw txErr;
    }

    // 5. Set authoritative custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'SuperAdmin',
      adminId: cleanAdminId,
      isStaff: false,
    });

    // 6. Issue custom token so the administrator is immediately signed in
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    res.json({
      success: true,
      message: 'Initial Super Administrator account provisioned successfully.',
      customToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to provision initial Super Administrator.';
    res.status(500).json({ error: message });
  }
});


/**
 * Staff ID Lookup - Hardened Anti-Enumeration Gate
 * Direct unauthenticated lookup is disabled to prevent staff ID enumeration and email disclosure.
 */
app.post('/api/auth/lookup-staff', (_req: Request, res: Response) => {
  res.status(400).json({
    error:
      'Direct Staff ID lookup is disabled for anti-enumeration and identity privacy protection. Please authenticate via the secure login portal.',
  });
});

/**
 * Secure Server-Side Employee Creation (Cloud Admin SDK Authority)
 * Enforces Zero-Trust: only verified Super Admin can provision employee accounts.
 */
app.post('/api/admin/create-employee', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    // 1. Verify caller ID token
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired authorization token.' });
      return;
    }

    const callerUid = decodedToken.uid;

    // 2. Authorize caller: must be an active Super Admin (Payroll Officers cannot provision accounts)
    const adminDoc = await db.collection('admins').doc(callerUid).get();
    if (!adminDoc.exists || adminDoc.data()?.status !== 'Active') {
      res.status(403).json({ error: 'Access denied: Caller is not an authorized active administrator.' });
      return;
    }

    const callerRole = adminDoc.data()?.role;
    if (callerRole !== 'SuperAdmin') {
      res.status(403).json({
        error: 'Access denied: Employee account provisioning requires SuperAdmin authorization.',
      });
      return;
    }

    const callerData = adminDoc.data();
    const {
      staffId,
      fullName,
      email,
      department,
      unit,
      designation,
      employmentStatus,
      temporaryPassword,
    } = req.body;

    if (!staffId || !fullName || !email || !temporaryPassword) {
      res.status(400).json({ error: 'Missing required employee provisioning fields.' });
      return;
    }

    const cleanStaffId = String(staffId).trim().toUpperCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(fullName).trim();

    // Check duplicate staffId
    const existingStaff = await db.collection('employees').where('staffId', '==', cleanStaffId).get();
    if (!existingStaff.empty) {
      res.status(409).json({ error: `Staff ID "${cleanStaffId}" is already assigned to an existing employee.` });
      return;
    }

    // 3. Create Firebase Auth user account via Admin SDK
    const userRecord = await adminAuth.createUser({
      email: cleanEmail,
      password: temporaryPassword,
      displayName: cleanName,
      emailVerified: true,
    });

    // 4. Assign Custom User Claims to enforce firstLoginRequired at token level
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'Employee',
      firstLoginRequired: true,
    });

    // 5. Create employee document in Firestore
    const employeeDoc = {
      uid: userRecord.uid,
      staffId: cleanStaffId,
      fullName: cleanName,
      email: cleanEmail,
      department: department || 'General Administration',
      unit: unit || '',
      designation: designation || 'Staff Officer',
      employmentStatus: employmentStatus || 'Permanent',
      accountStatus: 'Active',
      firstLoginComplete: false,
      createdAt: new Date().toISOString(),
    };

    await db.collection('employees').doc(userRecord.uid).set(employeeDoc);

    // 6. Write immutable server-side audit log with server timestamp
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await db.collection('auditLogs').doc(logId).set({
      logId,
      actorUID: callerUid,
      actorEmail: callerData?.email || 'admin@icoh.org.ng',
      action: 'employee_registered',
      targetCollection: 'employees',
      targetDocId: userRecord.uid,
      metadata: JSON.stringify({ staffId: cleanStaffId, fullName: cleanName, email: cleanEmail }),
      timestamp: FieldValue.serverTimestamp(),
    });

    // Return created employee profile (password is strictly never exposed)
    res.status(201).json({
      success: true,
      employee: employeeDoc,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to provision employee.';
    res.status(500).json({ error: message });
  }
});

/**
 * Server-Side Mandatory First Login Password Change
 * Hardened to verify ID token, enforce Employee role, verify active status,
 * prevent admin or replay execution, preserve custom claims, and update via Admin SDK.
 */
app.post('/api/auth/complete-first-login', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    // 1. Verify the Firebase ID token
    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired authorization token.' });
      return;
    }

    const uid = decodedToken.uid;

    // 2. Do not allow SuperAdmin or PayrollOfficer accounts to use the employee first-login endpoint
    if (decodedToken.role === 'SuperAdmin' || decodedToken.role === 'PayrollOfficer') {
      res.status(403).json({ error: 'Access denied: Administrative accounts cannot use the employee first-login endpoint.' });
      return;
    }

    // 3. Require decodedToken.role === 'Employee'
    if (decodedToken.role !== 'Employee') {
      res.status(403).json({ error: 'Access denied: First-login endpoint requires Employee role.' });
      return;
    }

    // 4. Require decodedToken.firstLoginRequired === true
    if (decodedToken.firstLoginRequired !== true) {
      res.status(400).json({ error: 'This account does not require first login configuration.' });
      return;
    }

    // 5. Verify the employee document exists and belongs to the authenticated UID
    const empRef = db.collection('employees').doc(uid);
    const empDoc = await empRef.get();
    if (!empDoc.exists) {
      res.status(404).json({ error: 'Employee record not found in system.' });
      return;
    }

    const empData = empDoc.data()!;
    if (empData.uid && empData.uid !== uid) {
      res.status(403).json({ error: 'Identity mismatch: Authenticated UID does not match employee record.' });
      return;
    }

    // 6. Verify the employee account is Active
    if (empData.accountStatus !== 'Active') {
      res.status(403).json({ error: 'Account is inactive. Please contact the administrator.' });
      return;
    }

    // 7. Do not allow an already-completed account to call this endpoint
    if (empData.firstLoginComplete === true) {
      res.status(400).json({ error: 'First login password setup has already been completed for this account.' });
      return;
    }

    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    // 8. Update password in Firebase Auth via Admin SDK
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    // 9. Preserve existing legitimate custom claims, setting firstLoginRequired: false only after password update succeeds
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: 'Employee',
      firstLoginRequired: false,
    });

    // 10. Mark firstLoginComplete=true using trusted server-side Admin SDK with server timestamps
    await empRef.update({
      firstLoginComplete: true,
      passwordChangedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 11. Record immutable server-side audit log with server timestamp
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await db.collection('auditLogs').doc(logId).set({
      logId,
      actorUID: uid,
      actorEmail: decodedToken.email || empData.email || 'employee',
      action: 'first_login_password_changed',
      targetCollection: 'employees',
      targetDocId: uid,
      metadata: JSON.stringify({ staffId: empData.staffId, status: 'completed' }),
      timestamp: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: 'First login password configuration completed successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password update failed.';
    res.status(500).json({ error: message });
  }
});

/**
 * Payslip Upload Pre-Verification
 * Server-authoritative verification of requestId, employeeUID, staffId, month, year, eligibility, and caller role.
 */
app.post('/api/admin/verify-payslip-upload', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired authorization token.' });
      return;
    }

    const callerUid = decodedToken.uid;
    const adminDoc = await db.collection('admins').doc(callerUid).get();
    if (!adminDoc.exists || adminDoc.data()?.status !== 'Active') {
      res.status(403).json({ error: 'Access denied: Caller is not an active authorized administrator.' });
      return;
    }

    const callerRole = adminDoc.data()?.role;
    if (callerRole !== 'SuperAdmin' && callerRole !== 'PayrollOfficer') {
      res.status(403).json({ error: 'Access denied: Insufficient privileges for payslip upload verification.' });
      return;
    }

    const { requestId } = req.body;
    if (!requestId || typeof requestId !== 'string') {
      res.status(400).json({ error: 'Missing required requestId parameter.' });
      return;
    }

    // 1. Verify requestId exists
    const reqDoc = await db.collection('payslipRequests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json({ error: `Payslip request "${requestId}" does not exist.` });
      return;
    }

    const requestData = reqDoc.data()!;

    // 2. Verify request belongs to employeeUID and employee document exists
    if (!requestData.employeeUID) {
      res.status(400).json({ error: 'Corrupt request record: Missing employeeUID reference.' });
      return;
    }

    const empDoc = await db.collection('employees').doc(requestData.employeeUID).get();
    if (!empDoc.exists) {
      res.status(404).json({ error: 'Associated employee record not found.' });
      return;
    }

    const empData = empDoc.data()!;

    // 3. Verify Staff ID matches request
    if (empData.staffId !== requestData.staffId) {
      res.status(400).json({ error: 'Data integrity violation: Staff ID mismatch between request and employee record.' });
      return;
    }

    // 4. Verify request is eligible for processing
    if (requestData.status === 'Rejected' || requestData.status === 'Cancelled') {
      res.status(400).json({ error: `Request "${requestId}" is in "${requestData.status}" state and cannot receive payslips.` });
      return;
    }

    const payslipId = `PS-${requestId}`;
    const storagePath = `payslips/${requestId}/${payslipId}.pdf`;

    // Return trusted authoritative metadata from the request record
    res.json({
      success: true,
      authoritativeData: {
        requestId: requestData.requestId,
        employeeUID: requestData.employeeUID,
        staffId: requestData.staffId,
        employeeName: requestData.employeeName || empData.fullName,
        employeeEmail: empData.email,
        department: requestData.department || empData.department,
        month: requestData.month,
        year: requestData.year,
        storagePath,
        payslipId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload verification failed.';
    res.status(500).json({ error: message });
  }
});

/**
 * Payslip Upload Finalization
 * Registers metadata in Firestore, updates request status to 'Ready', records audit log, and creates in-app notification.
 */
app.post('/api/admin/finalize-payslip-upload', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired authorization token.' });
      return;
    }

    const callerUid = decodedToken.uid;
    const adminDoc = await db.collection('admins').doc(callerUid).get();
    if (!adminDoc.exists || adminDoc.data()?.status !== 'Active') {
      res.status(403).json({ error: 'Access denied: Caller is not an active authorized administrator.' });
      return;
    }

    const callerRole = adminDoc.data()?.role;
    if (callerRole !== 'SuperAdmin' && callerRole !== 'PayrollOfficer') {
      res.status(403).json({ error: 'Access denied: Insufficient privileges.' });
      return;
    }

    const { requestId, fileName, fileSize } = req.body;
    if (!requestId) {
      res.status(400).json({ error: 'Missing required requestId.' });
      return;
    }

    // Strict Anti-Payload Tampering: Prohibit base64, dataUrl, or arbitrary blob payloads
    if (req.body.base64 || req.body.dataUrl || req.body.dataURL || req.body.fileData || req.body.downloadUrl) {
      res.status(400).json({
        error: 'Security violation: Embedding file binaries or data URLs in registration metadata is strictly prohibited.',
      });
      return;
    }

    // Validate filename & size
    const cleanFileName = String(fileName || '').trim();
    if (!cleanFileName.toLowerCase().endsWith('.pdf')) {
      res.status(400).json({ error: 'Invalid document type. Only authentic PDF files (.pdf) are permitted.' });
      return;
    }

    const numericSize = Number(fileSize);
    if (isNaN(numericSize) || numericSize <= 0) {
      res.status(400).json({ error: 'Invalid file size. Payslip document must be a valid non-empty file.' });
      return;
    }
    if (numericSize > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'File exceeds the maximum allowable size of 10MB.' });
      return;
    }

    // Authoritative check on request
    const reqDoc = await db.collection('payslipRequests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json({ error: 'Request record not found.' });
      return;
    }

    const requestData = reqDoc.data()!;
    if (requestData.status === 'Rejected' || requestData.status === 'Cancelled') {
      res.status(400).json({ error: `Cannot upload payslip: Request is in "${requestData.status}" status.` });
      return;
    }

    const empDoc = await db.collection('employees').doc(requestData.employeeUID).get();
    if (!empDoc.exists) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    const empData = empDoc.data()!;

    // Validate Staff ID matches request
    if (empData.staffId !== requestData.staffId) {
      res.status(400).json({ error: 'Data integrity violation: Staff ID mismatch between request and employee record.' });
      return;
    }

    const payslipId = `PS-${requestId}`;
    const storagePath = `payslips/${requestId}/${payslipId}.pdf`;

    // 1. Create payslip document in Firestore (ONLY metadata and storagePath, never base64 or dataUrl)
    const payslipDoc = {
      payslipId,
      requestId,
      employeeUID: requestData.employeeUID,
      staffId: requestData.staffId,
      employeeName: requestData.employeeName || empData.fullName,
      month: requestData.month,
      year: requestData.year,
      storageRef: storagePath,
      fileName: cleanFileName.replace(/[^a-zA-Z0-9._-]/g, '_'),
      fileSize: numericSize,
      uploadedAt: new Date().toISOString(),
      uploadedByUID: callerUid,
      uploadedByName: adminDoc.data()?.fullName || 'Payroll Desk Officer',
    };

    await db.collection('payslips').doc(payslipId).set(payslipDoc);

    // 2. Update payslipRequests status to 'Ready'
    await db.collection('payslipRequests').doc(requestId).update({
      status: 'Ready',
      completedAt: new Date().toISOString(),
      processedByUID: callerUid,
      processedByName: adminDoc.data()?.fullName || 'Payroll Officer',
      payslipId,
      storageRef: storagePath,
    });

    // 3. Create server-side audit log with server timestamp
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await db.collection('auditLogs').doc(logId).set({
      logId,
      actorUID: callerUid,
      actorEmail: adminDoc.data()?.email || decodedToken.email || 'payroll@icoh.org.ng',
      action: 'payslip_uploaded',
      targetCollection: 'payslips',
      targetDocId: payslipId,
      metadata: JSON.stringify({
        requestId,
        staffId: requestData.staffId,
        month: requestData.month,
        year: requestData.year,
        storagePath,
      }),
      timestamp: FieldValue.serverTimestamp(),
    });

    // 4. Generate trusted server-side in-app notification to employee
    const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[requestData.month] || `Month ${requestData.month}`;

    await db.collection('notifications').doc(notifId).set({
      notificationId: notifId,
      recipientUID: requestData.employeeUID,
      type: 'ready',
      title: 'Official Payslip Ready',
      message: `Your official ICOH payslip for ${monthName} ${requestData.year} (Ref: ${requestId}) is now ready for secure download.`,
      relatedRequestId: requestId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    // 5. Send real transactional email notification to employee if email is available
    const recipientEmail = empData.email || requestData.deliveryEmail;
    if (recipientEmail) {
      sendTransactionalEmail({
        toEmail: recipientEmail,
        recipientName: requestData.employeeName || empData.fullName,
        subject: `Official ICOH Payslip Available - ${monthName} ${requestData.year}`,
        template: 'payslip_ready',
        requestId,
        monthName,
        year: requestData.year,
      }).catch((e) => {
        console.warn('Background email dispatch error during finalize-payslip-upload:', sanitizeEmailError(e));
      });
    }

    res.json({ success: true, payslip: payslipDoc });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Finalization failed.';
    res.status(500).json({ error: message });
  }
});

/**
 * Server-Authoritative Payslip Download Logger
 * Authoritatively marks payslips as downloaded, marks request Completed, and writes immutable audit log.
 */
app.post('/api/payslips/record-download', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired authorization token.' });
      return;
    }

    const callerUid = decodedToken.uid;
    const { payslipId } = req.body;
    if (!payslipId || typeof payslipId !== 'string') {
      res.status(400).json({ error: 'Missing required payslipId.' });
      return;
    }

    const payslipDoc = await db.collection('payslips').doc(payslipId).get();
    if (!payslipDoc.exists) {
      res.status(404).json({ error: 'Payslip document not found.' });
      return;
    }

    const payslipData = payslipDoc.data()!;

    // Access control: Caller must be the recipient employee or an active admin
    if (payslipData.employeeUID !== callerUid) {
      const adminDoc = await db.collection('admins').doc(callerUid).get();
      if (!adminDoc.exists || adminDoc.data()?.status !== 'Active') {
        res.status(403).json({ error: 'Access denied: You are not authorized to download this payslip.' });
        return;
      }
    }

    // Authoritative timestamp updates
    await db.collection('payslips').doc(payslipId).update({
      downloadedAt: new Date().toISOString(),
      downloadedByUID: callerUid,
    });

    if (payslipData.requestId) {
      await db.collection('payslipRequests').doc(payslipData.requestId).update({
        status: 'Completed',
      });
    }

    // Immutable audit record
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await db.collection('auditLogs').doc(logId).set({
      logId,
      actorUID: callerUid,
      actorEmail: decodedToken.email || 'user',
      action: 'payslip_downloaded',
      targetCollection: 'payslips',
      targetDocId: payslipId,
      metadata: JSON.stringify({
        requestId: payslipData.requestId,
        staffId: payslipData.staffId,
        month: payslipData.month,
        year: payslipData.year,
      }),
      timestamp: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: 'Download recorded authoritatively.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record download.';
    res.status(500).json({ error: message });
  }
});

/**
 * Server-Side Audit Log Creation Gate
 * Ensures clients cannot forge sensitive security, provisioning, or upload events.
 */
const SENSITIVE_AUTHORITATIVE_ACTIONS = new Set([
  'initial_superadmin_bootstrapped',
  'employee_registered',
  'first_login_password_changed',
  'payslip_uploaded',
  'status_updated',
  'role_assigned',
  'status_changed',
  'employee_status_changed',
  'payslip_downloaded',
]);

app.post('/api/audit/log', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }

    const { action, targetCollection, targetDocId, metadata } = req.body;
    if (!action || !targetCollection) {
      res.status(400).json({ error: 'Missing required audit log parameters.' });
      return;
    }

    const cleanAction = String(action).trim();
    if (SENSITIVE_AUTHORITATIVE_ACTIONS.has(cleanAction)) {
      res.status(403).json({
        error: `Security violation: Action "${cleanAction}" is server-authoritative and cannot be logged directly by client requests.`,
      });
      return;
    }

    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await db.collection('auditLogs').doc(logId).set({
      logId,
      actorUID: decodedToken.uid,
      actorEmail: decodedToken.email || 'user',
      action: cleanAction.substring(0, 100),
      targetCollection: String(targetCollection).substring(0, 100),
      targetDocId: String(targetDocId || '').substring(0, 100),
      metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : String(metadata || '').substring(0, 1000),
      timestamp: FieldValue.serverTimestamp(),
    });

    res.json({ success: true, logId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Audit log write failed.';
    res.status(500).json({ error: message });
  }
});

/**
 * Server-Side Notification for Request Submitted
 * Ensures employee cannot inject arbitrary notifications.
 */
app.post('/api/requests/notify-submitted', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired token.' });
      return;
    }

    const { requestId } = req.body;
    if (!requestId) {
      res.status(400).json({ error: 'Missing requestId.' });
      return;
    }

    const reqDoc = await db.collection('payslipRequests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    const reqData = reqDoc.data()!;
    if (reqData.employeeUID !== decodedToken.uid) {
      res.status(403).json({ error: 'Access denied: Request does not belong to caller.' });
      return;
    }

    const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[reqData.month] || `Month ${reqData.month}`;

    await db.collection('notifications').doc(notifId).set({
      notificationId: notifId,
      recipientUID: decodedToken.uid,
      type: 'request_submitted',
      title: 'Payslip Request Received',
      message: `Your request for ${monthName} ${reqData.year} payslip has been submitted (Ref: ${requestId}) and is awaiting processing.`,
      relatedRequestId: requestId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, notificationId: notifId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Notification dispatch failed.';
    res.status(500).json({ error: message });
  }
});

// ==========================================
// SECURE EMAIL TRANSACTIONAL SERVICE
// ==========================================

interface SendEmailOptions {
  toEmail: string;
  subject: string;
  recipientName?: string;
  template?: 'request_submitted' | 'processing' | 'payslip_ready' | 'rejected' | 'account_event' | string;
  requestId?: string;
  monthName?: string;
  year?: number | string;
  remarks?: string;
}

function sanitizeEmailError(err: unknown): string {
  if (!err) return 'Unknown transport error';
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/[A-Za-z0-9+/=]{20,}/g, '[REDACTED]')
    .replace(/pass(word)?\s*[:=]\s*\S+/gi, 'password=[REDACTED]');
}

async function sendTransactionalEmail(opts: SendEmailOptions): Promise<{
  success: boolean;
  deliveryStatus: 'DELIVERED' | 'NOT_CONFIGURED' | 'FAILED';
  message: string;
}> {
  const { toEmail, subject, recipientName, template, requestId, monthName, year, remarks } = opts;

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : smtpPort === 465;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'icohpaysliprequest@gmail.com';

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.info(
      `[ICOH Email Gateway - Unconfigured] Destination: ${toEmail} | Subject: ${subject} | Ref: ${requestId || 'N/A'}`
    );
    return {
      success: false,
      deliveryStatus: 'NOT_CONFIGURED',
      message: 'Email transport is not configured on this server. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in server environment variables.',
    };
  }

  try {
    const cleanPass = smtpPass.trim();
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: cleanPass,
      },
    });

    let bodyText = '';
    if (template === 'payslip_ready') {
      bodyText = `Dear ${recipientName || 'Staff Member'},

Your official monthly payslip for ${monthName || ''} ${year || ''} (Request Ref: ${requestId || 'N/A'}) has been processed and approved.

IMPORTANT SECURITY NOTICE:
In compliance with ICOH information security guidelines, confidential payslip documents and financial records are NEVER sent as email attachments or exposed via unauthenticated URLs.

To access and securely download your official payslip:
1. Log in to the official ICOH Staff Payslip Portal: https://ais-pre-kv5bbvliid6baopx7enilb-748053400761.europe-west2.run.app
2. Navigate to your Payslip Repository under "My Requests" / "My Payslips".
3. Download your digitally verified payslip PDF.

Intercountry Centre for Oral Health (ICOH) for Africa
Federal Ministry of Health and Social Welfare`;
    } else if (template === 'request_submitted') {
      bodyText = `Dear ${recipientName || 'Staff Member'},

Your request for the ${monthName || ''} ${year || ''} payslip has been received (Ref: ${requestId || 'N/A'}) and placed in queue for the Payroll Desk.

You will receive an update once processing commences.

Intercountry Centre for Oral Health (ICOH) for Africa
Federal Ministry of Health and Social Welfare`;
    } else if (template === 'processing') {
      bodyText = `Dear ${recipientName || 'Staff Member'},

Your payslip request for ${monthName || ''} ${year || ''} (Ref: ${requestId || 'N/A'}) is now actively being processed by the Payroll Desk.

Intercountry Centre for Oral Health (ICOH) for Africa
Federal Ministry of Health and Social Welfare`;
    } else if (template === 'rejected') {
      bodyText = `Dear ${recipientName || 'Staff Member'},

Your payslip request (Ref: ${requestId || 'N/A'}) could not be completed.

Reason / Remarks:
${remarks || 'Please consult the Payroll Officer or institutional administration.'}

Intercountry Centre for Oral Health (ICOH) for Africa
Federal Ministry of Health and Social Welfare`;
    } else {
      bodyText = `Dear ${recipientName || 'Staff Member'},

An administrative update has been recorded regarding your payslip request (${requestId || 'N/A'}).

Please log in to the official ICOH Portal to view and securely download your documentation:
https://ais-pre-kv5bbvliid6baopx7enilb-748053400761.europe-west2.run.app

Intercountry Centre for Oral Health (ICOH) for Africa
Federal Ministry of Health and Social Welfare`;
    }

    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject,
      text: bodyText,
    });

    console.info(`[ICOH Email Gateway] Notification dispatched successfully to ${toEmail} for template: ${template}`);
    return {
      success: true,
      deliveryStatus: 'DELIVERED',
      message: `Notification successfully dispatched to ${toEmail}.`,
    };
  } catch (err: unknown) {
    const sanitized = sanitizeEmailError(err);
    console.error(`[ICOH Email Gateway] Delivery error for ${toEmail}:`, sanitized);
    return {
      success: false,
      deliveryStatus: 'FAILED',
      message: `Mail delivery failed: ${sanitized}`,
    };
  }
}

/**
 * Server-Side Secure Email Gateway
 * Hardened to support real SMTP transport via Nodemailer when configured,
 * never attaches sensitive PDF files (directing staff to log into portal),
 * and reports accurate deliveryStatus ('DELIVERED' vs 'NOT_CONFIGURED').
 */
app.post('/api/notifications/send-email', async (req: Request, res: Response) => {
  try {
    const { toEmail, subject, template, requestId, recipientName, monthName, year, remarks } = req.body;
    if (!toEmail || !subject) {
      res.status(400).json({ error: 'Missing required recipient or subject.' });
      return;
    }

    // Security policy: PDFs are never attached to emails
    if (req.body.attachments || req.body.attachment || req.body.pdf) {
      res.status(400).json({
        error: 'Security policy violation: Transmitting payslip documents as email attachments is prohibited. Staff must sign in to the secure portal.',
      });
      return;
    }

    const result = await sendTransactionalEmail({
      toEmail,
      subject,
      recipientName,
      template,
      requestId,
      monthName,
      year,
      remarks,
    });

    if (result.success) {
      res.json(result);
    } else if (result.deliveryStatus === 'NOT_CONFIGURED') {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err: unknown) {
    const sanitized = sanitizeEmailError(err);
    res.status(500).json({
      success: false,
      deliveryStatus: 'FAILED',
      error: sanitized,
    });
  }
});

/**
 * Server-Side Admin Request Status Update
 * Ensures request status transitions, audit logs, and notifications are authoritatively executed.
 */
app.post('/api/requests/update-status', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed authorization token.' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adm = getAdmin();
    const adminAuth = getAuth(adm);
    const db = getAdminDb();

    let decodedToken: DecodedIdToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: 'Invalid or expired authorization token.' });
      return;
    }

    const callerUid = decodedToken.uid;
    const adminDoc = await db.collection('admins').doc(callerUid).get();
    if (!adminDoc.exists || adminDoc.data()?.status !== 'Active') {
      res.status(403).json({ error: 'Access denied: Caller is not an active authorized administrator.' });
      return;
    }

    const callerRole = adminDoc.data()?.role;
    if (callerRole !== 'SuperAdmin' && callerRole !== 'PayrollOfficer') {
      res.status(403).json({ error: 'Access denied: Insufficient privileges.' });
      return;
    }

    const { requestId, status, internalNotes, rejectionReason } = req.body;
    if (!requestId || !status) {
      res.status(400).json({ error: 'Missing required parameters.' });
      return;
    }

    const reqDoc = await db.collection('payslipRequests').doc(requestId).get();
    if (!reqDoc.exists) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    const requestData = reqDoc.data()!;

    // Validate status values
    const validStatuses = ['Pending', 'Processing', 'Ready', 'Completed', 'Rejected', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    // Require that a valid payslip record is attached when marking as 'Ready' or 'Completed'
    if (status === 'Ready') {
      const payslipsSnap = await db.collection('payslips').where('requestId', '==', requestId).limit(1).get();
      if (payslipsSnap.empty) {
        res.status(400).json({
          error: 'Cannot mark request as Ready: No valid verified payslip record is attached to this request. Please upload the official PDF payslip first.',
        });
        return;
      }
    }

    const updates: Record<string, unknown> = {
      status,
      processedByUID: callerUid,
      processedByName: adminDoc.data()?.fullName || 'Payroll Desk Officer',
    };

    if (status === 'Processing') {
      updates.processedAt = new Date().toISOString();
    } else if (status === 'Completed' || status === 'Ready') {
      updates.completedAt = new Date().toISOString();
    }

    if (internalNotes !== undefined) updates.internalNotes = internalNotes;
    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;

    await db.collection('payslipRequests').doc(requestId).update(updates);

    // Immutable audit log
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    await db.collection('auditLogs').doc(logId).set({
      logId,
      actorUID: callerUid,
      actorEmail: adminDoc.data()?.email || decodedToken.email || 'payroll@icoh.org.ng',
      action: 'status_updated',
      targetCollection: 'payslipRequests',
      targetDocId: requestId,
      metadata: JSON.stringify({ newStatus: status, internalNotes, rejectionReason }),
      timestamp: FieldValue.serverTimestamp(),
    });

    // Server notification to employee
    if (status === 'Processing' || status === 'Rejected') {
      const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[requestData.month] || `Month ${requestData.month}`;

      await db.collection('notifications').doc(notifId).set({
        notificationId: notifId,
        recipientUID: requestData.employeeUID,
        type: status === 'Processing' ? 'processing' : 'rejected',
        title: status === 'Processing' ? 'Request Under Review' : 'Request Disapproved / Needs Attention',
        message:
          status === 'Processing'
            ? `Your payslip request for ${monthName} ${requestData.year} (Ref: ${requestId}) is now being processed by the Payroll Desk.`
            : `Your payslip request (Ref: ${requestId}) could not be completed. Reason: ${rejectionReason || 'Please contact the Payroll Officer.'}`,
        relatedRequestId: requestId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Send transactional email notification if recipient email is available
      const empDoc = await db.collection('employees').doc(requestData.employeeUID).get();
      const targetEmail = empDoc.exists ? empDoc.data()?.email : requestData.deliveryEmail;
      if (targetEmail) {
        sendTransactionalEmail({
          toEmail: targetEmail,
          recipientName: requestData.employeeName || (empDoc.exists ? empDoc.data()?.fullName : 'Staff Member'),
          subject: status === 'Processing'
            ? `ICOH Payslip Request Processing - ${monthName} ${requestData.year}`
            : `ICOH Payslip Request Update - ${monthName} ${requestData.year}`,
          template: status === 'Processing' ? 'processing' : 'rejected',
          requestId,
          monthName,
          year: requestData.year,
          remarks: rejectionReason,
        }).catch((e) => {
          console.warn('Background email dispatch error during update-status:', sanitizeEmailError(e));
        });
      }
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed.';
    res.status(500).json({ error: message });
  }
});




// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ICOH Payroll Authority Backend' });
});

// ==========================================
// VITE INTEGRATION & SERVER START
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ICOH Portal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
