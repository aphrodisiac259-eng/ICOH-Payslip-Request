/**
 * ICOH Portal - Firestore Data Service
 * Implements hardened CRUD operations, real-time listeners, and access gates.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/config';
import {
  PayslipRequest,
  Payslip,
  Employee,
  Department,
  SystemSetting,
  RequestStatus,
} from '../types';
import { logAuditEvent } from './auditService';
import { sendNotification } from './notificationService';
import { sendEmailNotification } from './emailService';
import { getMonthName } from '../utils/formatting';

// ==========================================
// PAYSLIP REQUESTS
// ==========================================

export async function createPayslipRequest(params: {
  requestId: string;
  employee: Employee;
  month: number;
  year: number;
  remarks?: string;
}): Promise<PayslipRequest> {
  const { requestId, employee, month, year, remarks } = params;
  const path = `payslipRequests/${requestId}`;

  // Session verification: Ensure employee matches authenticated user
  if (!auth.currentUser || auth.currentUser.uid !== employee.uid) {
    throw new Error('Security Error: Request can only be created for your own authenticated employee account.');
  }

  // Future month restriction
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    throw new Error('Requisitions for future months are not permitted. Please select the current or a prior pay cycle.');
  }

  // Duplicate check: Check if employee already has an active or pending request for this month & year
  try {
    const dupQuery = query(
      collection(db, 'payslipRequests'),
      where('employeeUID', '==', employee.uid),
      where('month', '==', month),
      where('year', '==', year)
    );
    const existingSnap = await getDocs(dupQuery);
    const hasActive = existingSnap.docs.some((d) => {
      const data = d.data() as PayslipRequest;
      return data.status !== 'Rejected' && data.status !== 'Cancelled';
    });

    if (hasActive) {
      throw new Error(
        `You have already submitted an active payslip request for ${getMonthName(month)} ${year}. Duplicate submissions are not permitted.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('already submitted')) {
      throw err;
    }
    // Proceed if query failed due to indexing, let the security rules and UI handle
  }

  const newRequest: PayslipRequest = {
    requestId,
    employeeUID: employee.uid,
    staffId: employee.staffId,
    employeeName: employee.fullName,
    department: employee.department,
    month,
    year,
    remarks: remarks || '',
    status: 'Pending',
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    requestedByUID: employee.uid,
    processedByUID: null,
    processedByName: null,
    internalNotes: null,
    rejectionReason: null,
  };

  try {
    await setDoc(doc(db, 'payslipRequests', requestId), newRequest);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Immutable audit log
  await logAuditEvent(
    employee.uid,
    employee.email,
    'request_created',
    'payslipRequests',
    requestId,
    { month, year, staffId: employee.staffId }
  );

  // In-app notification to employee
  await sendNotification(
    employee.uid,
    'request_submitted',
    'Payslip Request Received',
    `Your request for ${getMonthName(month)} ${year} payslip has been submitted (Ref: ${requestId}) and is awaiting processing.`,
    requestId
  );

  // Email confirmation
  if (employee.email) {
    await sendEmailNotification({
      toEmail: employee.email,
      recipientName: employee.fullName,
      subject: `ICOH Payslip Request Submitted (${requestId})`,
      template: 'request_submitted',
      requestId,
      monthName: getMonthName(month),
      year,
    });
  }

  return newRequest;
}

export function subscribeToEmployeeRequests(
  employeeUID: string,
  onData: (requests: PayslipRequest[]) => void
): Unsubscribe {
  const path = 'payslipRequests';
  try {
    const q = query(
      collection(db, path),
      where('employeeUID', '==', employeeUID),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as PayslipRequest[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToAllRequests(
  onData: (requests: PayslipRequest[]) => void
): Unsubscribe {
  const path = 'payslipRequests';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as PayslipRequest[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateRequestStatus(params: {
  requestId: string;
  status: RequestStatus;
  actorUID: string;
  actorEmail: string;
  actorName: string;
  internalNotes?: string;
  rejectionReason?: string;
}): Promise<void> {
  const { requestId, status, internalNotes, rejectionReason } = params;

  if (auth.currentUser) {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch('/api/requests/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        requestId,
        status,
        internalNotes,
        rejectionReason,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update request status on server.');
    }
  }
}


// ==========================================
// PAYSLIPS
// ==========================================

export function subscribeToEmployeePayslips(
  employeeUID: string,
  onData: (payslips: Payslip[]) => void
): Unsubscribe {
  const path = 'payslips';
  try {
    const q = query(
      collection(db, path),
      where('employeeUID', '==', employeeUID),
      orderBy('uploadedAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Payslip[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToAllPayslips(
  onData: (payslips: Payslip[]) => void
): Unsubscribe {
  const path = 'payslips';
  try {
    const q = query(collection(db, path), orderBy('uploadedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Payslip[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// EMPLOYEES
// ==========================================

export async function getEmployeeByUID(uid: string): Promise<Employee | null> {
  const path = `employees/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'employees', uid));
    return snap.exists() ? (snap.data() as Employee) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getEmployeeByStaffId(staffId: string): Promise<Employee | null> {
  const path = 'employees';
  try {
    const q = query(collection(db, path), where('staffId', '==', staffId.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Employee;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToAllEmployees(
  onData: (employees: Employee[]) => void
): Unsubscribe {
  const path = 'employees';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
        })) as Employee[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveEmployeeRecord(employee: Employee, actorUID: string, actorEmail: string): Promise<void> {
  const path = `employees/${employee.uid}`;
  try {
    await setDoc(doc(db, 'employees', employee.uid), employee, { merge: true });
    await logAuditEvent(
      actorUID,
      actorEmail,
      'employee_record_changed',
      'employees',
      employee.uid,
      { staffId: employee.staffId, accountStatus: employee.accountStatus, department: employee.department }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update Employee's Own Profile
 * Strictly allowlists editable contact/personal fields.
 * Prohibits tampering with staffId, email, role, department, designation, salaryGrade, step, bankDetails, employmentStatus, accountStatus.
 */
export async function updateEmployeeSelfProfile(
  uid: string,
  fields: {
    phoneNumber?: string;
    residentialAddress?: string;
    emergencyContact?: string;
    nextOfKin?: string;
    nextOfKinPhone?: string;
  }
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Security Error: You are only authorized to update your own profile record.');
  }

  const path = `employees/${uid}`;
  const payload: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  };

  if (typeof fields.phoneNumber === 'string') payload.phoneNumber = fields.phoneNumber.trim();
  if (typeof fields.residentialAddress === 'string') payload.residentialAddress = fields.residentialAddress.trim();
  if (typeof fields.emergencyContact === 'string') payload.emergencyContact = fields.emergencyContact.trim();
  if (typeof fields.nextOfKin === 'string') payload.nextOfKin = fields.nextOfKin.trim();
  if (typeof fields.nextOfKinPhone === 'string') payload.nextOfKinPhone = fields.nextOfKinPhone.trim();

  try {
    await updateDoc(doc(db, 'employees', uid), payload);
    await logAuditEvent(
      auth.currentUser.uid,
      auth.currentUser.email || 'employee',
      'employee_self_profile_updated',
      'employees',
      uid,
      { updatedFields: Object.keys(payload) }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// DEPARTMENTS
// ==========================================

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    departmentId: 'DEPT-DENT-01',
    name: 'Clinical Services & Specialized Dentistry',
    code: 'CLIN',
    description: 'Specialist oral health clinics, restorative dentistry, maxillofacial diagnostics.',
    createdAt: new Date().toISOString(),
  },
  {
    departmentId: 'DEPT-EPI-02',
    name: 'Epidemiology & Biostatistics',
    code: 'EPID',
    description: 'Surveillance of oral diseases, clinical data analytics, population health trials.',
    createdAt: new Date().toISOString(),
  },
  {
    departmentId: 'DEPT-COMM-03',
    name: 'Community Dental Health & Outreaches',
    code: 'CDH',
    description: 'Public health field surveys, school dental programs, rural community clinics.',
    createdAt: new Date().toISOString(),
  },
  {
    departmentId: 'DEPT-PATH-04',
    name: 'Oral Pathology & Laboratory Medicine',
    code: 'PATH',
    description: 'Histopathology, microbial analysis of oral infections, research biobanking.',
    createdAt: new Date().toISOString(),
  },
  {
    departmentId: 'DEPT-HR-05',
    name: 'Administration & Human Resources',
    code: 'AHR',
    description: 'Personnel records, career development, institutional administrative governance.',
    createdAt: new Date().toISOString(),
  },
  {
    departmentId: 'DEPT-FIN-06',
    name: 'Finance & Accounts (Payroll Division)',
    code: 'FIN',
    description: 'Remuneration, CONMESS/CONHESS salary processing, statutory pensions & tax.',
    createdAt: new Date().toISOString(),
  },
];

export async function getDepartments(): Promise<Department[]> {
  const path = 'departments';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      // Seed default ICOH departments
      for (const dept of DEFAULT_DEPARTMENTS) {
        await setDoc(doc(db, 'departments', dept.departmentId), dept);
      }
      return DEFAULT_DEPARTMENTS;
    }
    return snap.docs.map((d) => d.data() as Department);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getEmployeeRequests(employeeUID: string): Promise<PayslipRequest[]> {
  const path = 'payslipRequests';
  try {
    const q = query(collection(db, path), where('employeeUID', '==', employeeUID), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PayslipRequest);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getEmployeePayslips(employeeUID: string): Promise<Payslip[]> {
  const path = 'payslips';
  try {
    const q = query(collection(db, path), where('employeeUID', '==', employeeUID), orderBy('uploadedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Payslip);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveDepartment(dept: Department, actorUID?: string, actorEmail?: string): Promise<void> {
  const path = `departments/${dept.departmentId}`;
  try {
    await setDoc(doc(db, 'departments', dept.departmentId), dept, { merge: true });
    if (actorUID) {
      await logAuditEvent(actorUID, actorEmail || 'admin', 'department_saved', 'departments', dept.departmentId, {
        name: dept.name,
        code: dept.code,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// SYSTEM SETTINGS
// ==========================================

export const DEFAULT_SYSTEM_SETTING: SystemSetting = {
  settingId: 'default',
  organizationName: 'Intercountry Centre for Oral Health (ICOH) for Africa',
  supportEmail: 'payroll@icoh.org.ng',
  maxPayslipUploadSizeMB: 10,
  allowedYearRange: 5,
  updatedAt: new Date().toISOString(),
};

export async function getSystemSettings(): Promise<SystemSetting> {
  const path = 'systemSettings/default';
  try {
    const snap = await getDoc(doc(db, 'systemSettings', 'default'));
    if (!snap.exists()) {
      await setDoc(doc(db, 'systemSettings', 'default'), DEFAULT_SYSTEM_SETTING);
      return DEFAULT_SYSTEM_SETTING;
    }
    return snap.data() as SystemSetting;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateSystemSettings(
  settings: Partial<SystemSetting>,
  actorUID: string,
  actorEmail: string
): Promise<void> {
  const path = 'systemSettings/default';
  try {
    const updated = {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedByUID: actorUID,
    };
    await setDoc(doc(db, 'systemSettings', 'default'), updated, { merge: true });
    await logAuditEvent(actorUID, actorEmail, 'system_settings_updated', 'systemSettings', 'default', settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
